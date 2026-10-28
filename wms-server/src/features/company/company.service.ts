/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { basename, join } from 'node:path';
import { PrismaService } from '../../core/database/prisma.service.js';
import { Company, Prisma } from '../../../generated/prisma/client.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { UpdateCompanyLogoDto } from './dto/update-company-logo.dto.js';
import { CompanyResponseDto } from './dto/company-response.dto.js';

const EDITABLE_FIELDS = [
  'cnpj',
  'name',
  'tradeName',
  'stateRegistration',
  'phone',
  'street',
  'streetNumber',
  'neighborhood',
  'city',
  'state',
  'zipCode',
] as const;

const LOGO_DIR = process.env.DATA_DIR ?? join(process.cwd(), 'data');
const LOGO_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg' } as const;

// Guardado em settings.logo; o arquivo em si fica em LOGO_DIR
interface LogoSetting {
  file: string;
  mime: string;
}

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(private prisma: PrismaService) {}

  // Loga como error só o que não foi decisão do próprio service (falha de banco,
  // bug, etc). HttpException já foi logada como warn onde foi lançada.
  private rethrow(error: unknown, context: string): never {
    if (!(error instanceof HttpException)) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`${context}: ${reason}`);
    }
    throw error;
  }

  private maskLicenseKey(key: string | null): string | null {
    if (!key) return null;
    return key.length <= 4 ? '****' : `****${key.slice(-4)}`;
  }

  // Nunca devolve o licenseToken, e a licenseKey sai mascarada
  private toResponse(company: Company): CompanyResponseDto {
    const { licenseToken, licenseKey, ...rest } = company;
    return new CompanyResponseDto({
      ...rest,
      licenseKey: this.maskLicenseKey(licenseKey),
    });
  }

  private async findCompany(actor: string): Promise<Company> {
    const company = await this.prisma.client.company.findFirst();
    if (!company) {
      this.logger.warn(`Empresa não cadastrada (actor=${actor})`);
      throw new NotFoundException('Empresa não cadastrada');
    }
    return company;
  }

  // Só os campos enviados que realmente mudaram em relação ao registro atual
  private diff(
    current: Company,
    dto: UpdateCompanyDto,
  ): Prisma.CompanyUpdateInput {
    const changes: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      const value = dto[key];
      if (value !== undefined && value !== current[key]) {
        changes[key] = value;
      }
    }
    return changes;
  }

  // Cópia do settings como objeto; ignora valor nulo ou de outro formato
  private readSettings(company: Company): Record<string, unknown> {
    const value = company.settings;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? { ...(value as Record<string, unknown>) }
      : {};
  }

  async get(actor: string): Promise<CompanyResponseDto> {
    const company = await this.findCompany(actor);
    return this.toResponse(company);
  }

  async update(
    dto: UpdateCompanyDto,
    actor: string,
  ): Promise<CompanyResponseDto> {
    try {
      const company = await this.findCompany(actor);

      const changes = this.diff(company, dto);
      const fields = Object.keys(changes);

      if (fields.length === 0) {
        this.logger.warn(
          `Edição da empresa sem alterações (actor=${actor}, id=${company.id})`,
        );
        return this.toResponse(company);
      }

      const updated = await this.prisma.client.company.update({
        where: { id: company.id },
        data: changes,
      });

      // Só nomes dos campos, nunca valores
      this.logger.log(
        `Empresa editada (actor=${actor}, id=${company.id}, campos=${fields.join(',')})`,
      );

      if (changes.cnpj !== undefined) {
        this.logger.warn(
          `CNPJ da empresa alterado, a licença será revalidada com o novo CNPJ (actor=${actor}, de=${company.cnpj}, para=${updated.cnpj})`,
        );
      }

      return this.toResponse(updated);
    } catch (error) {
      this.rethrow(error, `Falha ao editar empresa (actor=${actor})`);
    }
  }

  async getLogo(actor: string): Promise<{ logo: string | null }> {
    try {
      const company = await this.findCompany(actor);
      const logo = this.readSettings(company).logo as LogoSetting | undefined;
      if (!logo) return { logo: null };

      try {
        const buffer = await fs.readFile(join(LOGO_DIR, basename(logo.file)));
        return {
          logo: `data:${logo.mime};base64,${buffer.toString('base64')}`,
        };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          this.logger.warn(
            `Arquivo da logo não encontrado (actor=${actor}, id=${company.id})`,
          );
          return { logo: null };
        }
        throw error;
      }
    } catch (error) {
      this.rethrow(error, `Falha ao ler logo da empresa (actor=${actor})`);
    }
  }

  async setLogo(
    dto: UpdateCompanyLogoDto,
    actor: string,
  ): Promise<{ logo: string | null }> {
    try {
      const company = await this.findCompany(actor);

      const match = /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(dto.logo);
      if (!match) {
        throw new BadRequestException('Logo deve ser PNG ou JPEG em base64');
      }
      const mime = match[1] as keyof typeof LOGO_EXT;
      const file = `company-logo.${LOGO_EXT[mime]}`;

      await fs.mkdir(LOGO_DIR, { recursive: true });
      await fs.writeFile(join(LOGO_DIR, file), Buffer.from(match[2], 'base64'));

      const settings = this.readSettings(company);
      const previous = settings.logo as LogoSetting | undefined;
      settings.logo = { file, mime };

      await this.prisma.client.company.update({
        where: { id: company.id },
        data: { settings: settings as Prisma.InputJsonObject },
      });

      // Se a extensão mudou (png <-> jpg), apaga o arquivo antigo
      if (previous && previous.file !== file) {
        await fs.rm(join(LOGO_DIR, basename(previous.file)), { force: true });
      }

      this.logger.log(
        `Logo da empresa atualizada (actor=${actor}, id=${company.id})`,
      );
      return { logo: dto.logo };
    } catch (error) {
      this.rethrow(
        error,
        `Falha ao atualizar logo da empresa (actor=${actor})`,
      );
    }
  }

  async removeLogo(actor: string): Promise<void> {
    try {
      const company = await this.findCompany(actor);
      const settings = this.readSettings(company);
      const previous = settings.logo as LogoSetting | undefined;
      if (!previous) return;

      delete settings.logo;
      await this.prisma.client.company.update({
        where: { id: company.id },
        data: { settings: settings as Prisma.InputJsonObject },
      });
      await fs.rm(join(LOGO_DIR, basename(previous.file)), { force: true });

      this.logger.log(
        `Logo da empresa removida (actor=${actor}, id=${company.id})`,
      );
    } catch (error) {
      this.rethrow(error, `Falha ao remover logo da empresa (actor=${actor})`);
    }
  }
}

/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { Company, Prisma } from '../../../generated/prisma/client.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
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
}

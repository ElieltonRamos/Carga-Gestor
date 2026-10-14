/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  Logger,
  HttpException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { LicenseSystemService } from '../license-system/license-system.service.js';
import { PrismaService } from '../../core/database/prisma.service.js';
import { Prisma, UserRole, User } from '../../../generated/prisma/client.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UserFiltersDto } from './dto/user-filter.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private licenseService: LicenseSystemService,
  ) {}

  private omitPassword(user: User): UserResponseDto {
    const { passwordHash, ...result } = user;
    return new UserResponseDto(result);
  }

  // Loga como error só o que não foi decisão do próprio service (falha de banco,
  // bug, etc). HttpException já foi logada como warn no ponto onde foi lançada.
  private rethrow(error: unknown, context: string): never {
    if (!(error instanceof HttpException)) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`${context}: ${reason}`);
    }
    throw error;
  }

  private async findActiveUserById(id: number, actor: string): Promise<User> {
    const user = await this.prisma.client.user.findFirst({
      where: { id, active: true },
    });
    if (!user) {
      this.logger.warn(
        `Usuário não encontrado ou inativo (actor=${actor}, alvoId=${id})`,
      );
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  private guardProtectedUser(
    id: number,
    action: 'editado' | 'removido',
    actor: string,
  ): void {
    if (id === 1) {
      this.logger.warn(
        `Operação recusada: usuário protegido não pode ser ${action} (actor=${actor}, alvoId=${id})`,
      );
      throw new BadRequestException(`Este usuário não pode ser ${action}`);
    }
  }

  private validateId(id: number): void {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestException('ID inválido');
    }
  }

  async create(
    createUserDto: CreateUserDto,
    actor: string,
  ): Promise<UserResponseDto> {
    try {
      const existing = await this.prisma.client.user.findUnique({
        where: { username: createUserDto.username },
      });
      if (existing) {
        this.logger.warn(
          `Criação de usuário recusada: username já em uso (actor=${actor}, alvo=${createUserDto.username})`,
        );
        throw new ConflictException('Nome de usuário já está em uso');
      }

      const passwordHash = await bcrypt.hash(createUserDto.password, 10);

      const user = await this.prisma.client.user.create({
        data: {
          name: createUserDto.name,
          username: createUserDto.username,
          passwordHash,
          role: createUserDto.role ?? UserRole.OPERATOR,
          active: createUserDto.active ?? true,
        },
      });

      this.logger.log(
        `Usuário criado (actor=${actor}, alvo=${user.username}, id=${user.id}, role=${user.role})`,
      );

      return this.omitPassword(user);
    } catch (error) {
      this.rethrow(
        error,
        `Falha ao criar usuário (actor=${actor}, alvo=${createUserDto.username})`,
      );
    }
  }

  async findAll(filters?: UserFiltersDto): Promise<UserResponseDto[]> {
    const where: Prisma.UserWhereInput = {
      active: filters?.active !== undefined ? filters.active : true,
    };

    if (filters?.username) {
      where.username = { contains: filters.username };
    }
    if (filters?.role) {
      where.role = filters.role;
    }

    const users = await this.prisma.client.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.omitPassword(user));
  }

  async findOne(id: number, actor: string): Promise<UserResponseDto> {
    this.validateId(id);
    const user = await this.findActiveUserById(id, actor);
    return this.omitPassword(user);
  }

  async findByUsername(username: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.client.user.findUnique({
      where: { username, active: true },
    });
    return user ? this.omitPassword(user) : null;
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    actor: string,
  ): Promise<UserResponseDto> {
    this.validateId(id);
    this.guardProtectedUser(id, 'editado', actor);

    try {
      const existingUser = await this.findActiveUserById(id, actor);

      if (
        updateUserDto.username &&
        updateUserDto.username !== existingUser.username
      ) {
        const usernameExists = await this.prisma.client.user.findFirst({
          where: { username: updateUserDto.username, id: { not: id } },
        });
        if (usernameExists) {
          this.logger.warn(
            `Edição de usuário recusada: username já em uso (actor=${actor}, alvo=${existingUser.username}, id=${id}, novoUsername=${updateUserDto.username})`,
          );
          throw new ConflictException('Nome de usuário já está em uso');
        }
      }

      const { password, ...rest } = updateUserDto;
      const data: Prisma.UserUpdateInput = { ...rest };

      if (password) {
        data.passwordHash = await bcrypt.hash(password, 10);
      }

      const user = await this.prisma.client.user.update({
        where: { id },
        data,
      });

      // Só nomes dos campos: nunca valores, para não vazar senha nem dados pessoais
      const changedFields = [
        ...Object.entries(rest)
          .filter(([, value]) => value !== undefined)
          .map(([key]) => key),
        ...(password ? ['password'] : []),
      ];
      const roleChange =
        user.role !== existingUser.role
          ? `, role=${existingUser.role}->${user.role}`
          : '';

      this.logger.log(
        `Usuário editado (actor=${actor}, alvo=${user.username}, id=${id}, campos=${changedFields.join(',') || 'nenhum'}${roleChange})`,
      );

      return this.omitPassword(user);
    } catch (error) {
      this.rethrow(
        error,
        `Falha ao editar usuário (actor=${actor}, alvoId=${id})`,
      );
    }
  }

  async remove(id: number, actor: string): Promise<{ message: string }> {
    this.validateId(id);
    this.guardProtectedUser(id, 'removido', actor);

    try {
      const user = await this.findActiveUserById(id, actor);

      await this.prisma.client.user.update({
        where: { id },
        data: { active: false },
      });

      this.logger.log(
        `Usuário desativado (actor=${actor}, alvo=${user.username}, id=${id})`,
      );

      return { message: 'Usuário removido com sucesso' };
    } catch (error) {
      this.rethrow(
        error,
        `Falha ao desativar usuário (actor=${actor}, alvoId=${id})`,
      );
    }
  }

  async validateCredentials(
    username: string,
    password: string,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.client.user.findUnique({
      where: { username, active: true },
    });

    if (!user) {
      this.logger.warn(
        `Credenciais recusadas: usuário inexistente ou inativo (user=${username})`,
      );
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(
        `Credenciais recusadas: senha inválida (user=${username})`,
      );
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.omitPassword(user);
  }

  // O tipo de retorno voltou a Promise<{ token: string }>, porque sem a licença não existe licenseWarning.
  // Ao reativar a licença, volte para Promise<{ token: string; licenseWarning?: string }>,
  // descomente os dois blocos e apague o return { token };.
  async login(loginDto: LoginDto): Promise<{ token: string }> {
    const { username, password } = loginDto;

    void this.licenseService.sendUsageReport(true);

    try {
      const user = await this.prisma.client.user.findUnique({
        where: { username },
      });

      if (!user) {
        this.logger.warn(
          `Tentativa de login recusada: usuário inexistente (user=${username})`,
        );
        throw new UnauthorizedException('Credenciais inválidas');
      }

      if (!user.active) {
        this.logger.warn(
          `Tentativa de login recusada: usuário inativo (user=${username})`,
        );
        throw new UnauthorizedException('Usuário inativo');
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        this.logger.warn(
          `Tentativa de login recusada: senha inválida (user=${username})`,
        );
        throw new UnauthorizedException('Credenciais inválidas');
      }

      // Licença inválida já é logada dentro de validate() depois descomentar
      // const license = await this.licenseService.validate(username);
      // if (!license.isValid) {
      //   throw new UnauthorizedException(
      //     'Licença inválida ou expirada. Entre em contato com o suporte.',
      //   );
      // }

      const payload = {
        userId: user.id,
        username: user.username,
        role: user.role,
      };
      const token = await this.jwtService.signAsync(payload);

      this.logger.log(`Login realizado (user=${username}, role=${user.role})`);

      // return license.message
      //   ? { token, licenseWarning: license.message }
      //   : { token };
      return { token };
    } catch (error) {
      this.rethrow(error, `Falha inesperada no login (user=${username})`);
    }
  }
}

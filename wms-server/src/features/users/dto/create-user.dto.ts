import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../../generated/prisma/client.js';

const ROLES = Object.values(UserRole).join(', ');

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateUserDto {
  @ApiProperty({ description: 'Nome completo', example: 'João da Silva' })
  @Transform(trim)
  @IsString({ message: 'O nome deve ser um texto' })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  @MaxLength(191, {
    message: 'O nome deve ter no máximo $constraint1 caracteres',
  })
  name: string;

  @ApiProperty({
    description: 'Nome de usuário usado no login (único)',
    example: 'joao.silva',
    minLength: 3,
    maxLength: 50,
  })
  @Transform(trim)
  @IsString({ message: 'O nome de usuário deve ser um texto' })
  @IsNotEmpty({ message: 'O nome de usuário é obrigatório' })
  @MinLength(3, {
    message: 'O nome de usuário deve ter no mínimo $constraint1 caracteres',
  })
  @MaxLength(50, {
    message: 'O nome de usuário deve ter no máximo $constraint1 caracteres',
  })
  @Matches(/^[A-Za-z0-9._-]+$/, {
    message:
      'O nome de usuário só pode conter letras, números, ponto, hífen e sublinhado',
  })
  username: string;

  @ApiProperty({
    description: 'Senha de acesso',
    example: 'senha123',
    minLength: 6,
    maxLength: 72,
    format: 'password',
  })
  @IsString({ message: 'A senha deve ser um texto' })
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  @MinLength(6, {
    message: 'A senha deve ter no mínimo $constraint1 caracteres',
  })
  @MaxLength(72, {
    message: 'A senha deve ter no máximo $constraint1 caracteres',
  })
  password: string;

  @ApiPropertyOptional({
    description: 'Papel do usuário no sistema',
    enum: UserRole,
    enumName: 'UserRole',
    default: UserRole.OPERATOR,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: `O papel deve ser um dos valores: ${ROLES}` })
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Indica se o usuário está ativo',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'O campo ativo deve ser verdadeiro ou falso' })
  active?: boolean;
}

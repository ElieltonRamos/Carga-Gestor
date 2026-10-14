import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../../../generated/prisma/client.js';

const ROLES = Object.values(UserRole).join(', ');

// Query string chega como texto: 'false' viraria true com um Boolean() direto
const toBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};

export class UserFiltersDto {
  @ApiPropertyOptional({
    description: 'Filtra por parte do nome de usuário',
    example: 'joao',
  })
  @IsOptional()
  @IsString({ message: 'O filtro de nome de usuário deve ser um texto' })
  username?: string;

  @ApiPropertyOptional({
    description: 'Filtra pelo papel do usuário',
    enum: UserRole,
    enumName: 'UserRole',
  })
  @IsOptional()
  @IsEnum(UserRole, {
    message: `O filtro de papel deve ser um dos valores: ${ROLES}`,
  })
  role?: UserRole;

  @ApiPropertyOptional({
    description:
      'Filtra por usuários ativos ou inativos (padrão: apenas ativos)',
    type: Boolean,
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: 'O filtro ativo deve ser verdadeiro ou falso' })
  active?: boolean;
}

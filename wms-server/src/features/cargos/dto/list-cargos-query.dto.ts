import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  IsDateOnly,
  trimOrNull,
  ValidationMessages,
} from '../../../core/utils/validation';
import { CargoStatus } from '../../../../generated/prisma/client.js';
import { PaginationQueryDto } from '../../../core/utils/pagination-query.dto';

export class ListCargosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Status da carga',
    enum: CargoStatus,
    enumName: 'CargoStatus',
  })
  @IsOptional()
  @IsEnum(CargoStatus, { message: ValidationMessages.IS_ENUM('O status') })
  status?: CargoStatus;

  @ApiPropertyOptional({
    description: 'Busca por ordem de carga, motorista ou caminhão',
    example: 'OC-2026',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: ValidationMessages.IS_STRING('A busca') })
  @MaxLength(191, { message: ValidationMessages.MAX_LENGTH('A busca', 191) })
  search?: string | null;

  @ApiPropertyOptional({
    description: 'Data da carga (AAAA-MM-DD)',
    example: '2026-10-15',
  })
  @IsOptional()
  @IsDateOnly('A data da carga')
  loadDate?: string;

  @ApiPropertyOptional({
    description:
      'Criadas a partir desta data (AAAA-MM-DD, fuso America/Sao_Paulo). Sem createdFrom e createdTo, filtra o dia atual',
    example: '2026-10-15',
  })
  @IsOptional()
  @IsDateOnly('A data inicial')
  createdFrom?: string;

  @ApiPropertyOptional({
    description: 'Criadas até esta data (AAAA-MM-DD, fuso America/Sao_Paulo)',
    example: '2026-10-15',
  })
  @IsOptional()
  @IsDateOnly('A data final')
  createdTo?: string;
}

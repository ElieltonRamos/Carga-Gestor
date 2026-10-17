import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { IsDateOnly, ValidationMessages } from '../../../core/utils/validation';
import { ScanResult } from '../../../../generated/prisma/client.js';
import { PaginationQueryDto } from '../../../core/utils/pagination-query.dto';

export class ListScansQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Id da carga', example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: ValidationMessages.IS_INT('A carga') })
  @Min(1, { message: ValidationMessages.MIN('A carga', 1) })
  cargoId?: number;

  @ApiPropertyOptional({
    description: 'Resultado da bipagem',
    enum: ScanResult,
    enumName: 'ScanResult',
  })
  @IsOptional()
  @IsEnum(ScanResult, { message: ValidationMessages.IS_ENUM('O resultado') })
  result?: ScanResult;

  @ApiPropertyOptional({ description: 'Id do usuário', example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: ValidationMessages.IS_INT('O usuário') })
  @Min(1, { message: ValidationMessages.MIN('O usuário', 1) })
  userId?: number;

  @ApiPropertyOptional({
    description: 'A partir desta data (AAAA-MM-DD, fuso America/Sao_Paulo)',
    example: '2026-10-16',
  })
  @IsOptional()
  @IsDateOnly('A data inicial')
  createdFrom?: string;

  @ApiPropertyOptional({
    description: 'Até esta data (AAAA-MM-DD, fuso America/Sao_Paulo)',
    example: '2026-10-16',
  })
  @IsOptional()
  @IsDateOnly('A data final')
  createdTo?: string;
}

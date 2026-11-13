import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../core/utils/pagination-query.dto.js';
import { trimOrNull } from '../../../core/utils/validation';

export class ListDriversQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Busca por nome' })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(191)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtra por situação. Padrão: só ativos',
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  active?: boolean;
}

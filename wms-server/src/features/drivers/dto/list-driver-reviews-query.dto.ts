import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../core/utils/pagination-query.dto.js';

export class ListDriverReviewsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtra pela carga avaliada',
    example: 12,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A carga deve ser um id válido' })
  @Min(1, { message: 'A carga deve ser um id válido' })
  cargoId?: number;
}
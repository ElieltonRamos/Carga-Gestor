import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../core/utils/pagination-query.dto';
import { trimOrNull } from '../../../core/utils/validation-messages';

export class ListClientsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Busca por nome ou documento' })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: 'A busca deve ser um texto' })
  @ApiPropertyOptional({
    description: 'Busca por nome ou documento',
    nullable: true,
    type: String,
  })
  search?: string | null;
}

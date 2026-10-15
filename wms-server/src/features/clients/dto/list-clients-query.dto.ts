import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { trimOrNull, ValidationMessages } from '../../../core/utils/validation';
import { PaginationQueryDto } from '../../../core/utils/pagination-query.dto';

export class ListClientsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Busca por nome ou documento',
    example: 'Prefeitura',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: ValidationMessages.IS_STRING('A busca') })
  @MaxLength(191, { message: ValidationMessages.MAX_LENGTH('A busca', 191) })
  search?: string | null;
}

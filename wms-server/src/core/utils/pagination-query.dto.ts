import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ValidationMessages } from '../utils/validation';

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Página',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: ValidationMessages.IS_INT('A página') })
  @Min(1, { message: ValidationMessages.MIN('A página', 1) })
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Itens por página',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: ValidationMessages.IS_INT('O limite') })
  @Min(1, { message: ValidationMessages.MIN('O limite', 1) })
  @Max(100, { message: ValidationMessages.MAX('O limite', 100) })
  limit: number = 10;
}

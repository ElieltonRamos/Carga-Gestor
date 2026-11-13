import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { trimOrNull, ValidationMessages } from '../../../core/utils/validation';

export class CreateDriverReviewDto {
  @ApiProperty({ description: 'Nota de 1 a 5', example: 5 })
  @Type(() => Number)
  @IsInt({ message: 'A nota deve ser um número inteiro' })
  @Min(1, { message: 'A nota deve ser de 1 a 5' })
  @Max(5, { message: 'A nota deve ser de 1 a 5' })
  rating: number;

  @ApiPropertyOptional({
    description: 'Carga a que a avaliação se refere',
    example: 12,
    nullable: true,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A carga deve ser um id válido' })
  @Min(1, { message: 'A carga deve ser um id válido' })
  cargoId?: number | null;

  @ApiPropertyOptional({
    description: 'Comentário',
    example: 'Chegou no horário',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: ValidationMessages.IS_STRING('O comentário') })
  @MaxLength(1000, {
    message: ValidationMessages.MAX_LENGTH('O comentário', 1000),
  })
  comment?: string | null;
}

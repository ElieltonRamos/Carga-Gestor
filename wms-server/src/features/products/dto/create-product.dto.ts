import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { trim, ValidationMessages } from '../../../core/utils/validation';

export class CreateProductDto {
  @ApiProperty({ description: 'Nome do produto', example: 'Mesa escolar' })
  @Transform(trim)
  @IsString({ message: ValidationMessages.IS_STRING('O nome') })
  @IsNotEmpty({ message: ValidationMessages.IS_NOT_EMPTY('O nome') })
  @MaxLength(191, { message: ValidationMessages.MAX_LENGTH('O nome', 191) })
  name: string;

  @ApiPropertyOptional({
    description: 'Peso total do item, em kg (até 3 casas decimais)',
    example: 12.5,
    nullable: true,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'O peso deve ser um número com até 3 casas decimais' },
  )
  @Min(0, { message: 'O peso não pode ser negativo' })
  @Max(9999999.999, { message: 'O peso é muito grande' })
  weight?: number | null;

  @ApiPropertyOptional({
    description: 'Volumes por unidade',
    example: 2,
    nullable: true,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Os volumes devem ser um número inteiro' })
  @Min(1, { message: 'Os volumes devem ser no mínimo 1' })
  @Max(10000, { message: 'Quantidade de volumes muito grande' })
  volumeCount?: number | null;
}

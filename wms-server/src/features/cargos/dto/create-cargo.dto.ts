import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  IsDateOnly,
  trim,
  ValidationMessages,
} from '../../../core/utils/validation';
import { CargoHeaderDto } from './cargo-header.dto';
import { CargoDeliveryDto } from './cargo-delivery.dto';

export class CreateCargoDto extends CargoHeaderDto {
  @ApiProperty({
    description: 'Ordem de carga (única)',
    example: 'OC-2026-0001',
  })
  @Transform(trim)
  @IsString({ message: ValidationMessages.IS_STRING('A ordem de carga') })
  @IsNotEmpty({ message: ValidationMessages.IS_NOT_EMPTY('A ordem de carga') })
  @MaxLength(191, {
    message: ValidationMessages.MAX_LENGTH('A ordem de carga', 191),
  })
  loadOrder: string;

  @ApiProperty({
    description: 'Data da carga (AAAA-MM-DD)',
    example: '2026-10-15',
  })
  @IsDateOnly('A data da carga')
  loadDate: string;

  @ApiProperty({
    description: 'Data de emissão (AAAA-MM-DD)',
    example: '2026-10-14',
  })
  @IsDateOnly('A data de emissão')
  issueDate: string;

  @ApiProperty({
    description: 'Romaneios da carga, com cliente e itens',
    type: [CargoDeliveryDto],
  })
  @IsArray({ message: ValidationMessages.IS_ARRAY('Os romaneios') })
  @ArrayNotEmpty({
    message: ValidationMessages.ARRAY_NOT_EMPTY('Os romaneios'),
  })
  @ValidateNested({ each: true })
  @Type(() => CargoDeliveryDto)
  deliveries: CargoDeliveryDto[];
}

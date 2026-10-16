import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  IsDateOnly,
  trim,
  ValidationMessages,
} from '../../../core/utils/validation';
import { CargoHeaderDto } from './cargo-header.dto';
import { CargoDeliveryDto } from './cargo-delivery.dto';

export class UpdateCargoDto extends CargoHeaderDto {
  @ApiPropertyOptional({
    description: 'Ordem de carga (única). Só altera com a carga aberta',
    example: 'OC-2026-0001',
  })
  @ValidateIf((o: UpdateCargoDto) => o.loadOrder !== undefined)
  @Transform(trim)
  @IsString({ message: ValidationMessages.IS_STRING('A ordem de carga') })
  @IsNotEmpty({ message: ValidationMessages.IS_NOT_BLANK('A ordem de carga') })
  @MaxLength(191, {
    message: ValidationMessages.MAX_LENGTH('A ordem de carga', 191),
  })
  loadOrder?: string;

  @ApiPropertyOptional({
    description: 'Data da carga (AAAA-MM-DD)',
    example: '2026-10-15',
  })
  @ValidateIf((o: UpdateCargoDto) => o.loadDate !== undefined)
  @IsDateOnly('A data da carga')
  loadDate?: string;

  @ApiPropertyOptional({
    description: 'Data de emissão (AAAA-MM-DD)',
    example: '2026-10-14',
  })
  @ValidateIf((o: UpdateCargoDto) => o.issueDate !== undefined)
  @IsDateOnly('A data de emissão')
  issueDate?: string;

  @ApiPropertyOptional({
    description:
      'Lista completa de romaneios. Com id mantém o romaneio, sem id cria, e o que não vier é removido. Alterações estruturais só com a carga aberta e sem volumes carregados',
    type: [CargoDeliveryDto],
  })
  @ValidateIf((o: UpdateCargoDto) => o.deliveries !== undefined)
  @IsArray({ message: ValidationMessages.IS_ARRAY('Os romaneios') })
  @ArrayNotEmpty({
    message: ValidationMessages.ARRAY_NOT_EMPTY('Os romaneios'),
  })
  @ValidateNested({ each: true })
  @Type(() => CargoDeliveryDto)
  deliveries?: CargoDeliveryDto[];
}

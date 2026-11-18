import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  IsDateOnly,
  trimOrNull,
  ValidationMessages,
} from '../../../core/utils/validation';
import { CargoHeaderDto } from './cargo-header.dto';
import { CargoDeliveryDto } from './cargo-delivery.dto';

export class UpdateCargoDto extends CargoHeaderDto {
  @ApiPropertyOptional({
    description: 'Ordem de carga (opcional, pode repetir). Vazio ou null limpa o valor',
    example: 'OC-2026-0001',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: ValidationMessages.IS_STRING('A ordem de carga') })
  @MaxLength(191, {
    message: ValidationMessages.MAX_LENGTH('A ordem de carga', 191),
  })
  loadOrder?: string | null;

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

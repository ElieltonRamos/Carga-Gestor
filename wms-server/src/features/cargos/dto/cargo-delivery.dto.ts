import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateClientDto } from '../../clients/dto/create-client.dto';
import {
  trim,
  trimOrNull,
  ValidationMessages,
} from '../../../core/utils/validation';

// Mesmo formato do cadastro de clientes, usado como snapshot no romaneio
export class CargoClientDto extends CreateClientDto {}

export class CargoItemDto {
  @ApiPropertyOptional({
    description:
      'Id do item. Só na edição: informado, mantém o item existente; ausente, cria um novo',
    example: 87,
  })
  @IsOptional()
  @IsInt({ message: ValidationMessages.IS_INT('O id do item') })
  @Min(1, { message: ValidationMessages.MIN('O id do item', 1) })
  id?: number;

  @ApiPropertyOptional({
    description: 'Código do produto',
    example: 'PRD-001',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: ValidationMessages.IS_STRING('O código') })
  @MaxLength(191, { message: ValidationMessages.MAX_LENGTH('O código', 191) })
  code?: string | null;

  @ApiProperty({ description: 'Produto', example: 'Mesa escolar' })
  @Transform(trim)
  @IsString({ message: ValidationMessages.IS_STRING('O produto') })
  @IsNotEmpty({ message: ValidationMessages.IS_NOT_EMPTY('O produto') })
  @MaxLength(191, { message: ValidationMessages.MAX_LENGTH('O produto', 191) })
  product: string;

  @ApiProperty({ description: 'Quantidade', example: 10, minimum: 1 })
  @IsInt({ message: ValidationMessages.IS_INT('A quantidade') })
  @Min(1, { message: ValidationMessages.MIN('A quantidade', 1) })
  quantity: number;

  @ApiPropertyOptional({
    description: 'Quantidade de volumes do item. Vazio equivale a 1 volume',
    example: 2,
    minimum: 1,
    maximum: 9999,
    nullable: true,
    type: Number,
  })
  @IsOptional()
  @IsInt({ message: ValidationMessages.IS_INT('A quantidade de volumes') })
  @Min(1, { message: ValidationMessages.MIN('A quantidade de volumes', 1) })
  @Max(9999, {
    message: ValidationMessages.MAX('A quantidade de volumes', 9999),
  })
  volumeCount?: number | null;

  @ApiPropertyOptional({
    description: 'Peso em kg',
    example: 12.5,
    nullable: true,
    type: Number,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: ValidationMessages.IS_DECIMAL('O peso', 3) },
  )
  @Min(0, { message: ValidationMessages.MIN('O peso', 0) })
  @Max(9999999.999, { message: ValidationMessages.MAX('O peso', 9999999.999) })
  weight?: number | null;

  @ApiPropertyOptional({
    description: 'Observações do item',
    example: 'Frágil',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: ValidationMessages.IS_STRING('A observação') })
  @MaxLength(65535, {
    message: ValidationMessages.MAX_LENGTH('A observação', 65535),
  })
  notes?: string | null;
}

export class CargoDeliveryDto {
  @ApiPropertyOptional({
    description:
      'Id do romaneio. Só na edição: informado, mantém o romaneio existente; ausente, cria um novo',
    example: 12,
  })
  @IsOptional()
  @IsInt({ message: ValidationMessages.IS_INT('O id do romaneio') })
  @Min(1, { message: ValidationMessages.MIN('O id do romaneio', 1) })
  id?: number;

  @ApiProperty({
    description: 'Número do romaneio (único)',
    example: '2026-0001',
  })
  @Transform(trim)
  @IsString({ message: ValidationMessages.IS_STRING('O número do romaneio') })
  @IsNotEmpty({
    message: ValidationMessages.IS_NOT_EMPTY('O número do romaneio'),
  })
  @MaxLength(191, {
    message: ValidationMessages.MAX_LENGTH('O número do romaneio', 191),
  })
  romaneioNumber: string;

  @ApiPropertyOptional({
    description: 'Número da licitação',
    example: '045/2026',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: ValidationMessages.IS_STRING('O número da licitação') })
  @MaxLength(191, {
    message: ValidationMessages.MAX_LENGTH('O número da licitação', 191),
  })
  biddingNumber?: string | null;

  @ApiPropertyOptional({
    description: 'Modalidade',
    example: 'Pregão eletrônico',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: ValidationMessages.IS_STRING('A modalidade') })
  @MaxLength(191, {
    message: ValidationMessages.MAX_LENGTH('A modalidade', 191),
  })
  modality?: string | null;

  @ApiPropertyOptional({
    description: 'Indica se o romaneio inclui instalação',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: ValidationMessages.IS_BOOLEAN('A instalação') })
  hasInstallation?: boolean;

  @ApiPropertyOptional({
    description:
      'Id de um cliente cadastrado, usado para preencher o snapshot. Só na criação do romaneio',
    example: 1,
  })
  @IsOptional()
  @IsInt({ message: ValidationMessages.IS_INT('O id do cliente') })
  @Min(1, { message: ValidationMessages.MIN('O id do cliente', 1) })
  clientId?: number;

  @ApiPropertyOptional({
    description:
      'Dados do cliente (snapshot). Na criação, obrigatório se clientId não for informado. Na edição, atualiza o snapshot; trocar o documento reaponta o cadastro do cliente',
    type: CargoClientDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CargoClientDto)
  client?: CargoClientDto;

  @ApiProperty({ description: 'Itens do romaneio', type: [CargoItemDto] })
  @IsArray({ message: ValidationMessages.IS_ARRAY('Os itens') })
  @ArrayNotEmpty({ message: ValidationMessages.ARRAY_NOT_EMPTY('Os itens') })
  @ValidateNested({ each: true })
  @Type(() => CargoItemDto)
  items: CargoItemDto[];
}

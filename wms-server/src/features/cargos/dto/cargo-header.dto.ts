import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { trimOrNull, ValidationMessages } from '../../../core/utils/validation';

export class CargoHeaderDto {
  @ApiPropertyOptional({
    description: 'Nome do motorista',
    example: 'João da Silva',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: ValidationMessages.IS_STRING('O motorista') })
  @MaxLength(191, {
    message: ValidationMessages.MAX_LENGTH('O motorista', 191),
  })
  driverName?: string | null;

  @ApiPropertyOptional({
    description: 'Telefone do motorista',
    example: '(38) 99999-9999',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({
    message: ValidationMessages.IS_STRING('O telefone do motorista'),
  })
  @MaxLength(20, {
    message: ValidationMessages.MAX_LENGTH('O telefone do motorista', 20),
  })
  driverPhone?: string | null;

  @ApiPropertyOptional({
    description: 'Caminhão (placa ou identificação)',
    example: 'ABC-1D23',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: ValidationMessages.IS_STRING('O caminhão') })
  @MaxLength(191, { message: ValidationMessages.MAX_LENGTH('O caminhão', 191) })
  truck?: string | null;

  @ApiPropertyOptional({
    description: 'Responsável pela conferência',
    example: 'Maria Souza',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({
    message: ValidationMessages.IS_STRING('O responsável pela conferência'),
  })
  @MaxLength(191, {
    message: ValidationMessages.MAX_LENGTH(
      'O responsável pela conferência',
      191,
    ),
  })
  inspectionResponsible?: string | null;

  @ApiPropertyOptional({
    description: 'Responsável pela organização',
    example: 'Carlos Lima',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({
    message: ValidationMessages.IS_STRING('O responsável pela organização'),
  })
  @MaxLength(191, {
    message: ValidationMessages.MAX_LENGTH(
      'O responsável pela organização',
      191,
    ),
  })
  organizationResponsible?: string | null;

  @ApiPropertyOptional({
    description: 'Ajudante',
    example: 'Pedro Alves',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: ValidationMessages.IS_STRING('O ajudante') })
  @MaxLength(191, { message: ValidationMessages.MAX_LENGTH('O ajudante', 191) })
  assistant1?: string | null;

  @ApiPropertyOptional({
    description: 'Responsável pelo carregamento',
    example: 'José Santos',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({
    message: ValidationMessages.IS_STRING('O responsável pelo carregamento'),
  })
  @MaxLength(191, {
    message: ValidationMessages.MAX_LENGTH(
      'O responsável pelo carregamento',
      191,
    ),
  })
  loadingResponsible?: string | null;

  @ApiPropertyOptional({
    description: 'Almoxarife',
    example: 'Ana Costa',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: ValidationMessages.IS_STRING('O almoxarife') })
  @MaxLength(191, {
    message: ValidationMessages.MAX_LENGTH('O almoxarife', 191),
  })
  warehouseKeeper?: string | null;

  @ApiPropertyOptional({
    description: 'Responsável pelo romaneio',
    example: 'Paulo Rocha',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({
    message: ValidationMessages.IS_STRING('O responsável pelo romaneio'),
  })
  @MaxLength(191, {
    message: ValidationMessages.MAX_LENGTH('O responsável pelo romaneio', 191),
  })
  romaneioResponsible?: string | null;
}

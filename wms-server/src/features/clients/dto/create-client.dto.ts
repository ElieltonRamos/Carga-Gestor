import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  digitsOrNull,
  trim,
  trimOrNull,
  upperOrNull,
  ValidationMessages,
} from '../../../core/utils/validation';

export class CreateClientDto {
  @ApiProperty({
    description: 'Nome do cliente',
    example: 'Prefeitura de Espinosa',
  })
  @Transform(trim)
  @IsString({ message: ValidationMessages.IS_STRING('O nome') })
  @IsNotEmpty({ message: ValidationMessages.IS_NOT_EMPTY('O nome') })
  @MaxLength(191, { message: ValidationMessages.MAX_LENGTH('O nome', 191) })
  name: string;

  @ApiPropertyOptional({
    description: 'CPF ou CNPJ (aceita máscara, é salvo só com os dígitos)',
    example: '12345678000195',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(digitsOrNull)
  @Matches(/^(\d{11}|\d{14})$/, {
    message: 'O documento deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ)',
  })
  document?: string | null;

  @ApiPropertyOptional({
    description: 'Endereço',
    example: 'Rua das Flores, 123',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: ValidationMessages.IS_STRING('O endereço') })
  @MaxLength(191, {
    message: ValidationMessages.MAX_LENGTH('O endereço', 191),
  })
  address?: string | null;

  @ApiPropertyOptional({
    description: 'Bairro',
    example: 'Centro',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: ValidationMessages.IS_STRING('O bairro') })
  @MaxLength(191, { message: ValidationMessages.MAX_LENGTH('O bairro', 191) })
  neighborhood?: string | null;

  @ApiProperty({ description: 'Cidade', example: 'Espinosa' })
  @Transform(trim)
  @IsString({ message: ValidationMessages.IS_STRING('A cidade') })
  @IsNotEmpty({ message: ValidationMessages.IS_NOT_EMPTY('A cidade') })
  @MaxLength(191, { message: ValidationMessages.MAX_LENGTH('A cidade', 191) })
  city: string;

  @ApiPropertyOptional({
    description: 'UF com 2 letras',
    example: 'MG',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(upperOrNull)
  @Matches(/^[A-Z]{2}$/, { message: 'A UF deve ter 2 letras' })
  state?: string | null;

  @ApiPropertyOptional({
    description: 'CEP (aceita máscara, é salvo só com os 8 dígitos)',
    example: '39400000',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(digitsOrNull)
  @Matches(/^\d{8}$/, { message: ValidationMessages.EXACT_DIGITS('O CEP', 8) })
  zipCode?: string | null;

  @ApiPropertyOptional({
    description: 'Telefone',
    example: '(38) 99999-9999',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: ValidationMessages.IS_STRING('O telefone') })
  @MaxLength(20, { message: ValidationMessages.MAX_LENGTH('O telefone', 20) })
  phone?: string | null;
}

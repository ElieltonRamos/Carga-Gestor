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
} from '../../../core/utils/validation-messages';

export class CreateClientDto {
  @ApiProperty({
    description: 'Nome do cliente',
    example: 'Prefeitura de Espinosa',
  })
  @Transform(trim)
  @IsString({ message: 'O nome deve ser um texto' })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  @MaxLength(191, {
    message: 'O nome deve ter no máximo $constraint1 caracteres',
  })
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
  @IsString({ message: 'O endereço deve ser um texto' })
  @MaxLength(191, {
    message: 'O endereço deve ter no máximo $constraint1 caracteres',
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
  @IsString({ message: 'O bairro deve ser um texto' })
  @MaxLength(191, {
    message: 'O bairro deve ter no máximo $constraint1 caracteres',
  })
  neighborhood?: string | null;

  @ApiProperty({ description: 'Cidade', example: 'Espinosa' })
  @Transform(trim)
  @IsString({ message: 'A cidade deve ser um texto' })
  @IsNotEmpty({ message: 'A cidade é obrigatória' })
  @MaxLength(191, {
    message: 'A cidade deve ter no máximo $constraint1 caracteres',
  })
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
  @Matches(/^\d{8}$/, { message: 'O CEP deve ter 8 dígitos' })
  zipCode?: string | null;

  @ApiPropertyOptional({
    description: 'Telefone',
    example: '(38) 99999-9999',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: 'O telefone deve ser um texto' })
  @MaxLength(20, {
    message: 'O telefone deve ter no máximo $constraint1 caracteres',
  })
  phone?: string | null;
}

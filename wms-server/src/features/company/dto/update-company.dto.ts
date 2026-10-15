import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  digits,
  digitsOrNull,
  trim,
  trimOrNull,
  upperOrNull,
  ValidationMessages,
} from '../../../core/utils/validation';

export class UpdateCompanyDto {
  @ApiPropertyOptional({
    description: 'CNPJ (aceita máscara, é salvo só com os 14 dígitos)',
    example: '12345678000195',
  })
  @ValidateIf((o: UpdateCompanyDto) => o.cnpj !== undefined)
  @Transform(digits)
  @Matches(/^\d{14}$/, {
    message: ValidationMessages.EXACT_DIGITS('O CNPJ', 14),
  })
  cnpj?: string;

  @ApiPropertyOptional({ description: 'Razão social', example: 'Empresa LTDA' })
  @ValidateIf((o: UpdateCompanyDto) => o.name !== undefined)
  @Transform(trim)
  @IsString({ message: ValidationMessages.IS_STRING('A razão social') })
  @IsNotEmpty({ message: ValidationMessages.IS_NOT_BLANK('A razão social') })
  @MaxLength(191, {
    message: ValidationMessages.MAX_LENGTH('A razão social', 191),
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Nome fantasia',
    example: 'Empresa',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: ValidationMessages.IS_STRING('O nome fantasia') })
  @MaxLength(191, {
    message: ValidationMessages.MAX_LENGTH('O nome fantasia', 191),
  })
  tradeName?: string | null;

  @ApiPropertyOptional({
    description: 'Inscrição estadual',
    example: '123456789',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: ValidationMessages.IS_STRING('A inscrição estadual') })
  @MaxLength(20, {
    message: ValidationMessages.MAX_LENGTH('A inscrição estadual', 20),
  })
  stateRegistration?: string | null;

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

  @ApiPropertyOptional({
    description: 'Logradouro',
    example: 'Rua das Flores',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: ValidationMessages.IS_STRING('O logradouro') })
  @MaxLength(191, {
    message: ValidationMessages.MAX_LENGTH('O logradouro', 191),
  })
  street?: string | null;

  @ApiPropertyOptional({
    description: 'Número',
    example: '123',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: ValidationMessages.IS_STRING('O número') })
  @MaxLength(20, { message: ValidationMessages.MAX_LENGTH('O número', 20) })
  streetNumber?: string | null;

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

  @ApiPropertyOptional({
    description: 'Cidade',
    example: 'Espinosa',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: ValidationMessages.IS_STRING('A cidade') })
  @MaxLength(191, { message: ValidationMessages.MAX_LENGTH('A cidade', 191) })
  city?: string | null;

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
}

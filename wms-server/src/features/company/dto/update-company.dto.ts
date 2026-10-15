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

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// String vazia vira null, para limpar um campo opcional
const trimOrNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const digits = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/\D/g, '') : value;

const digitsOrNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const onlyDigits = value.replace(/\D/g, '');
  return onlyDigits === '' ? null : onlyDigits;
};

const upperOrNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const upper = value.trim().toUpperCase();
  return upper === '' ? null : upper;
};

export class UpdateCompanyDto {
  @ApiPropertyOptional({
    description: 'CNPJ (aceita máscara, é salvo só com os 14 dígitos)',
    example: '12345678000195',
  })
  @ValidateIf((o: UpdateCompanyDto) => o.cnpj !== undefined)
  @Transform(digits)
  @Matches(/^\d{14}$/, { message: 'O CNPJ deve ter 14 dígitos' })
  cnpj?: string;

  @ApiPropertyOptional({ description: 'Razão social', example: 'Empresa LTDA' })
  @ValidateIf((o: UpdateCompanyDto) => o.name !== undefined)
  @Transform(trim)
  @IsString({ message: 'A razão social deve ser um texto' })
  @IsNotEmpty({ message: 'A razão social não pode ser vazia' })
  @MaxLength(191, {
    message: 'A razão social deve ter no máximo $constraint1 caracteres',
  })
  name?: string;

  @ApiPropertyOptional({ description: 'Nome fantasia', nullable: true })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: 'O nome fantasia deve ser um texto' })
  @MaxLength(191, {
    message: 'O nome fantasia deve ter no máximo $constraint1 caracteres',
  })
  tradeName?: string | null;

  @ApiPropertyOptional({ description: 'Inscrição estadual', nullable: true })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: 'A inscrição estadual deve ser um texto' })
  @MaxLength(20, {
    message: 'A inscrição estadual deve ter no máximo $constraint1 caracteres',
  })
  stateRegistration?: string | null;

  @ApiPropertyOptional({ description: 'Telefone', nullable: true })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: 'O telefone deve ser um texto' })
  @MaxLength(20, {
    message: 'O telefone deve ter no máximo $constraint1 caracteres',
  })
  phone?: string | null;

  @ApiPropertyOptional({ description: 'Logradouro', nullable: true })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: 'O logradouro deve ser um texto' })
  @MaxLength(191, {
    message: 'O logradouro deve ter no máximo $constraint1 caracteres',
  })
  street?: string | null;

  @ApiPropertyOptional({
    description: 'Número',
    example: '123',
    nullable: true,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: 'O número deve ser um texto' })
  @MaxLength(20, {
    message: 'O número deve ter no máximo $constraint1 caracteres',
  })
  streetNumber?: string | null;

  @ApiPropertyOptional({ description: 'Bairro', nullable: true })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: 'O bairro deve ser um texto' })
  @MaxLength(191, {
    message: 'O bairro deve ter no máximo $constraint1 caracteres',
  })
  neighborhood?: string | null;

  @ApiPropertyOptional({ description: 'Cidade', nullable: true })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString({ message: 'A cidade deve ser um texto' })
  @MaxLength(191, {
    message: 'A cidade deve ter no máximo $constraint1 caracteres',
  })
  city?: string | null;

  @ApiPropertyOptional({
    description: 'UF com 2 letras',
    example: 'MG',
    nullable: true,
  })
  @IsOptional()
  @Transform(upperOrNull)
  @Matches(/^[A-Z]{2}$/, { message: 'A UF deve ter 2 letras' })
  state?: string | null;

  @ApiPropertyOptional({
    description: 'CEP (aceita máscara, é salvo só com os 8 dígitos)',
    example: '39400000',
    nullable: true,
  })
  @IsOptional()
  @Transform(digitsOrNull)
  @Matches(/^\d{8}$/, { message: 'O CEP deve ter 8 dígitos' })
  zipCode?: string | null;
}

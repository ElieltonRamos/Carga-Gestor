import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  trim,
  trimOrNull,
  ValidationMessages,
} from '../../../core/utils/validation';

export class CreateDriverDto {
  @ApiProperty({ description: 'Nome do motorista', example: 'José da Silva' })
  @Transform(trim)
  @IsString({ message: ValidationMessages.IS_STRING('O nome') })
  @IsNotEmpty({ message: ValidationMessages.IS_NOT_EMPTY('O nome') })
  @MaxLength(191, { message: ValidationMessages.MAX_LENGTH('O nome', 191) })
  name: string;

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

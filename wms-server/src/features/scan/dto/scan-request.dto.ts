import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { trim, ValidationMessages } from '../../../core/utils/validation';

export class ScanRequestDto {
  @ApiProperty({
    description: 'Código do volume lido na etiqueta',
    example: '12-2-87-1',
  })
  @Transform(trim)
  @IsString({ message: ValidationMessages.IS_STRING('O código') })
  @IsNotEmpty({ message: ValidationMessages.IS_NOT_EMPTY('O código') })
  @MaxLength(191, { message: ValidationMessages.MAX_LENGTH('O código', 191) })
  code: string;

  @ApiProperty({ description: 'Id da carga conferida', example: 1, minimum: 1 })
  @IsInt({ message: ValidationMessages.IS_INT('A carga') })
  @Min(1, { message: ValidationMessages.MIN('A carga', 1) })
  cargoId: number;
}

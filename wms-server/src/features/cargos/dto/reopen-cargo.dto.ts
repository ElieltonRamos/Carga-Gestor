import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { trim, ValidationMessages } from '../../../core/utils/validation';

export class ReopenCargoDto {
  @ApiProperty({
    description: 'Motivo da reabertura (registrado no log)',
    example: 'Volume avariado precisa ser retirado da carga',
  })
  @Transform(trim)
  @IsString({ message: ValidationMessages.IS_STRING('O motivo') })
  @IsNotEmpty({ message: ValidationMessages.IS_NOT_EMPTY('O motivo') })
  @MaxLength(500, { message: ValidationMessages.MAX_LENGTH('O motivo', 500) })
  reason: string;
}

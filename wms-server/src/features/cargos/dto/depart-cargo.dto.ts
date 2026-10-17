import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { ValidationMessages } from '../../../core/utils/validation';

export class DepartCargoDto {
  @ApiPropertyOptional({
    description:
      'Confirma a expedição mesmo com volumes pendentes. Sem isso, a expedição incompleta é recusada',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: ValidationMessages.IS_BOOLEAN('A confirmação') })
  force?: boolean;
}

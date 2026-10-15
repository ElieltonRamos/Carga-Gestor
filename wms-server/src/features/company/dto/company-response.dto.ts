import { ApiProperty } from '@nestjs/swagger';
import { Company, Prisma } from '../../../../generated/prisma/client.js';

export class CompanyResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '12345678000195' })
  cnpj: string;

  @ApiProperty({ example: 'Empresa LTDA' })
  name: string;

  @ApiProperty({ nullable: true, type: String })
  tradeName: string | null;

  @ApiProperty({ nullable: true, type: String })
  stateRegistration: string | null;

  @ApiProperty({ nullable: true, type: String })
  phone: string | null;

  @ApiProperty({ nullable: true, type: String })
  street: string | null;

  @ApiProperty({ nullable: true, type: String })
  streetNumber: string | null;

  @ApiProperty({ nullable: true, type: String })
  neighborhood: string | null;

  @ApiProperty({ nullable: true, type: String })
  city: string | null;

  @ApiProperty({ nullable: true, type: String, example: 'MG' })
  state: string | null;

  @ApiProperty({ nullable: true, type: String })
  zipCode: string | null;

  @ApiProperty({
    description: 'Chave de licença mascarada (só os 4 últimos caracteres)',
    nullable: true,
    type: String,
    example: '****A1B2',
  })
  licenseKey: string | null;

  @ApiProperty({
    nullable: true,
    type: 'object',
    additionalProperties: true,
  })
  settings: Prisma.JsonValue | null;

  @ApiProperty({ example: '2026-10-13T22:40:17.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-13T22:40:17.000Z' })
  updatedAt: Date;

  constructor(
    partial: Omit<Company, 'licenseKey' | 'licenseToken'> & {
      licenseKey: string | null;
    },
  ) {
    Object.assign(this, partial);
  }
}

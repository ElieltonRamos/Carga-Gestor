import { ApiProperty } from '@nestjs/swagger';
import { ScanReason, ScanResult } from '../../../../generated/prisma/client.js';

export class ScanLogResponseDto {
  @ApiProperty({ description: 'Id da bipagem', example: 1 })
  id: number;

  @ApiProperty({ description: 'Código lido', example: '12-2-87-1' })
  code: string;

  @ApiProperty({
    description: 'Resultado da bipagem',
    enum: ScanResult,
    enumName: 'ScanResult',
    example: 'OK',
  })
  result: ScanResult;

  @ApiProperty({
    description: 'Motivo da recusa. Nulo quando a operação foi aceita',
    enum: ScanReason,
    enumName: 'ScanReason',
    nullable: true,
    example: null,
  })
  reason: ScanReason | null;

  @ApiProperty({
    description: 'Id do volume. Nulo quando o código não existe',
    nullable: true,
    type: Number,
    example: 301,
  })
  volumeId: number | null;

  @ApiProperty({
    description: 'Id da carga conferida',
    nullable: true,
    type: Number,
    example: 12,
  })
  cargoId: number | null;

  @ApiProperty({ description: 'Id do usuário', example: 3 })
  userId: number;

  @ApiProperty({ description: 'Nome do usuário', example: 'Maria Souza' })
  userName: string;

  @ApiProperty({
    description: 'Identificador do aparelho (header x-device-id)',
    nullable: true,
    type: String,
    example: '3f6c1c52-8a4e-4d1a-9b7e-2f5d0c9a1b34',
  })
  device: string | null;

  @ApiProperty({
    description: 'Data e hora da bipagem',
    example: '2026-10-16T13:20:00.000Z',
  })
  createdAt: Date;

  constructor(partial: Partial<ScanLogResponseDto>) {
    Object.assign(this, partial);
  }
}

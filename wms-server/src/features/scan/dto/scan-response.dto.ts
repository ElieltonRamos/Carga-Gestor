import { ApiProperty } from '@nestjs/swagger';
import {
  CargoStatus,
  ScanReason,
  ScanResult,
} from '../../../../generated/prisma/client.js';

export class ScanVolumeDto {
  @ApiProperty({ example: 301 })
  id: number;

  @ApiProperty({ description: 'Número do volume dentro do item', example: 1 })
  number: number;

  @ApiProperty({ example: 'Mesa escolar' })
  product: string;

  @ApiProperty({ example: '2026-0001' })
  romaneioNumber: string;

  @ApiProperty({
    description: 'Se o volume está carregado após a operação',
    example: true,
  })
  loaded: boolean;

  @ApiProperty({
    nullable: true,
    type: Date,
    example: '2026-10-16T13:20:00.000Z',
  })
  loadedAt: Date | null;
}

export class ScanResponseDto {
  @ApiProperty({ enum: ScanResult, enumName: 'ScanResult', example: 'OK' })
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
    description: 'Mensagem pronta para exibir',
    example: 'Volume carregado',
  })
  message: string;

  @ApiProperty({ description: 'Código lido', example: '12-2-87-1' })
  code: string;

  @ApiProperty({ example: 12 })
  cargoId: number;

  @ApiProperty({
    enum: CargoStatus,
    enumName: 'CargoStatus',
    example: 'LOADING',
  })
  cargoStatus: CargoStatus;

  @ApiProperty({ description: 'Total de volumes da carga', example: 24 })
  totalVolumes: number;

  @ApiProperty({ description: 'Volumes já carregados', example: 10 })
  loadedVolumes: number;

  @ApiProperty({
    description:
      'Dados do volume. Nulo quando o código não existe ou é de outra carga',
    type: ScanVolumeDto,
    nullable: true,
  })
  volume: ScanVolumeDto | null;

  constructor(partial: Partial<ScanResponseDto>) {
    Object.assign(this, partial);
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { CargoStatus } from '../../../../generated/prisma/client.js';

export class CargoListItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'OC-2026-0001' })
  loadOrder: string;

  @ApiProperty({ description: 'Quantidade de romaneios', example: 3 })
  totalDestinations: number;

  @ApiProperty({ enum: CargoStatus, enumName: 'CargoStatus', example: 'OPEN' })
  status: CargoStatus;

  @ApiProperty({ example: '2026-10-15T00:00:00.000Z' })
  loadDate: Date;

  @ApiProperty({ example: '2026-10-14T00:00:00.000Z' })
  issueDate: Date;

  @ApiProperty({ nullable: true, type: String })
  driverName: string | null;

  @ApiProperty({ nullable: true, type: String })
  driverPhone: string | null;

  @ApiProperty({ nullable: true, type: String })
  truck: string | null;

  @ApiProperty({ nullable: true, type: String })
  inspectionResponsible: string | null;

  @ApiProperty({ nullable: true, type: String })
  organizationResponsible: string | null;

  @ApiProperty({ nullable: true, type: String })
  assistant1: string | null;

  @ApiProperty({ nullable: true, type: String })
  loadingResponsible: string | null;

  @ApiProperty({ nullable: true, type: String })
  warehouseKeeper: string | null;

  @ApiProperty({ nullable: true, type: String })
  romaneioResponsible: string | null;

  @ApiProperty({
    nullable: true,
    type: Date,
    example: '2026-10-15T13:00:00.000Z',
  })
  startedAt: Date | null;

  @ApiProperty({
    nullable: true,
    type: Date,
    example: '2026-10-15T15:00:00.000Z',
  })
  endedAt: Date | null;

  @ApiProperty({
    nullable: true,
    type: Date,
    example: '2026-10-15T16:00:00.000Z',
  })
  departedAt: Date | null;

  @ApiProperty({ example: '2026-10-14T22:40:17.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-14T22:40:17.000Z' })
  updatedAt: Date;

  @ApiProperty({ description: 'Total de volumes da carga', example: 24 })
  totalVolumes: number;

  @ApiProperty({ description: 'Volumes já carregados', example: 10 })
  loadedVolumes: number;

  constructor(partial: Partial<CargoListItemDto>) {
    Object.assign(this, partial);
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { DeliveryStatus } from '../../../../generated/prisma/client.js';
import { CargoListItemDto } from './cargo-list-item.dto.js';

export class CargoItemResponseDto {
  @ApiProperty({ example: 87 })
  id: number;

  @ApiProperty({ example: 12 })
  deliveryId: number;

  @ApiProperty({ nullable: true, type: String, example: 'PRD-001' })
  code: string | null;

  @ApiProperty({ example: 'Mesa escolar' })
  product: string;

  @ApiProperty({ example: 10 })
  quantity: number;

  @ApiProperty({ nullable: true, type: Number, example: 2 })
  volumeCount: number | null;

  @ApiProperty({ nullable: true, type: Number, example: 12.5 })
  weight: number | null;

  @ApiProperty({ nullable: true, type: String })
  notes: string | null;
}

export class CargoDeliveryResponseDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 1 })
  cargoId: number;

  @ApiProperty({
    description: 'Cadastro de cliente de origem, quando houver',
    nullable: true,
    type: Number,
    example: 1,
  })
  clientId: number | null;

  @ApiProperty({ example: 1 })
  sequence: number;

  @ApiProperty({ example: '2026-0001' })
  romaneioNumber: string;

  @ApiProperty({ nullable: true, type: String })
  biddingNumber: string | null;

  @ApiProperty({ nullable: true, type: String })
  modality: string | null;

  @ApiProperty({ example: false })
  hasInstallation: boolean;

  @ApiProperty({
    enum: DeliveryStatus,
    enumName: 'DeliveryStatus',
    example: 'GENERATED',
  })
  status: DeliveryStatus;

  @ApiProperty({ example: 'Prefeitura de Espinosa' })
  clientName: string;

  @ApiProperty({ nullable: true, type: String, example: '12345678000195' })
  clientDocument: string | null;

  @ApiProperty({ nullable: true, type: String })
  clientAddress: string | null;

  @ApiProperty({ nullable: true, type: String })
  clientNeighborhood: string | null;

  @ApiProperty({ example: 'Espinosa' })
  clientCity: string;

  @ApiProperty({ nullable: true, type: String, example: 'MG' })
  clientState: string | null;

  @ApiProperty({ nullable: true, type: String, example: '39400000' })
  clientZipCode: string | null;

  @ApiProperty({ nullable: true, type: String })
  clientPhone: string | null;

  @ApiProperty({ type: [CargoItemResponseDto] })
  items: CargoItemResponseDto[];
}

export class CargoResponseDto extends CargoListItemDto {
  @ApiProperty({ type: [CargoDeliveryResponseDto] })
  deliveries: CargoDeliveryResponseDto[];

  constructor(partial: Partial<CargoResponseDto>) {
    super(partial);
    // Reatribui para o caso de o target inicializar os campos da subclasse após o super()
    Object.assign(this, partial);
  }
}

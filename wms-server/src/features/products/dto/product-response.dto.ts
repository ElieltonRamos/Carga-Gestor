import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../../../../generated/prisma/client.js';

export class ProductResponseDto {
  @ApiProperty({ description: 'Também é o código do produto', example: 1 })
  id: number;

  @ApiProperty({ example: 'Mesa escolar' })
  name: string;

  @ApiProperty({
    description: 'Peso total do item, em kg',
    nullable: true,
    type: Number,
    example: 12.5,
  })
  weight: number | null;

  @ApiProperty({
    description: 'Volumes por unidade',
    nullable: true,
    type: Number,
    example: 2,
  })
  volumeCount: number | null;

  @ApiProperty() active: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(product: Product) {
    this.id = product.id;
    this.name = product.name;
    this.weight = product.weight === null ? null : product.weight.toNumber();
    this.volumeCount = product.volumeCount;
    this.active = product.active;
    this.createdAt = product.createdAt;
    this.updatedAt = product.updatedAt;
  }
}

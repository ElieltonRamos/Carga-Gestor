import { ApiProperty } from '@nestjs/swagger';
import { Driver } from '../../../../generated/prisma/client.js';

export type RatingStats = { averageRating: number | null; reviewCount: number };

export class DriverResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true, type: String }) phone: string | null;
  @ApiProperty() active: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  @ApiProperty({
    description:
      'Média das avaliações, com 1 casa decimal. Nulo se não houver avaliações',
    nullable: true,
    type: Number,
    example: 4.5,
  })
  averageRating: number | null;

  @ApiProperty({ description: 'Quantidade de avaliações', example: 3 })
  reviewCount: number;

  constructor(driver: Driver, stats?: RatingStats) {
    this.id = driver.id;
    this.name = driver.name;
    this.phone = driver.phone;
    this.active = driver.active;
    this.createdAt = driver.createdAt;
    this.updatedAt = driver.updatedAt;
    this.averageRating = stats?.averageRating ?? null;
    this.reviewCount = stats?.reviewCount ?? 0;
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { DriverReview } from '../../../../generated/prisma/client.js';

type ReviewRow = DriverReview & {
  user: { name: string };
  cargo: { loadOrder: string } | null;
};

export class DriverReviewResponseDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 1 }) driverId: number;
  @ApiProperty({ nullable: true, type: Number }) cargoId: number | null;
  @ApiProperty({ nullable: true, type: String, example: 'OC-2026-0001' })
  cargoLoadOrder: string | null;
  @ApiProperty({ example: 2 }) userId: number;
  @ApiProperty({ example: 'João' }) userName: string;
  @ApiProperty({ example: 5 }) rating: number;
  @ApiProperty({ nullable: true, type: String }) comment: string | null;
  @ApiProperty() createdAt: Date;

  constructor(review: ReviewRow) {
    this.id = review.id;
    this.driverId = review.driverId;
    this.cargoId = review.cargoId;
    this.cargoLoadOrder = review.cargo?.loadOrder ?? null;
    this.userId = review.userId;
    this.userName = review.user.name;
    this.rating = review.rating;
    this.comment = review.comment;
    this.createdAt = review.createdAt;
  }
}

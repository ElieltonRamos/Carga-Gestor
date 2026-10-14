import { ApiProperty } from '@nestjs/swagger';
import { User, UserRole } from '../../../../generated/prisma/client.js';

export class UserResponseDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'João da Silva' })
  name: string;

  @ApiProperty({ example: 'joao.silva' })
  username: string;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role: UserRole;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty({ example: '2026-10-13T22:40:17.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-13T22:40:17.000Z' })
  updatedAt: Date;

  constructor(partial: Omit<User, 'passwordHash'>) {
    Object.assign(this, partial);
  }
}

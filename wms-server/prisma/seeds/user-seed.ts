import * as bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '../../generated/prisma/client';

export async function seedUsers(prisma: PrismaClient) {
  const users = [
    {
      name: 'Root',
      username: 'root',
      password: 'impostoeroubo',
      role: UserRole.ADMIN,
    },
  ];

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        name: user.name,
        username: user.username,
        passwordHash,
        role: user.role,
        active: true,
      },
    });
  }

  console.log('✓ Users seed');
}

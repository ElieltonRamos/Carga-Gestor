import { PrismaClient } from '../../generated/prisma/client';

export async function seedCompany(prisma: PrismaClient) {
  const existing = await prisma.company.findFirst();
  if (existing) {
    console.log('✓ Company seed (já existe)');
    return;
  }

  await prisma.company.create({
    data: {
      cnpj: '00000000000000',
      name: 'Empresa Padrão',
      tradeName: 'Empresa Padrão',
      stateRegistration: null,
      phone: null,
      street: null,
      streetNumber: null,
      neighborhood: null,
      city: null,
      state: null,
      zipCode: null,
    },
  });

  console.log('✓ Company seed');
}

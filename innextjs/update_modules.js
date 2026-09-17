const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const modulesToCreate = [
    { module_key: 'orders', name: 'Orders' },
    { module_key: 'production', name: 'Production' },
    { module_key: 'bom', name: 'BOM' },
  ];

  for (const mod of modulesToCreate) {
    await prisma.module.upsert({
      where: { module_key: mod.module_key },
      update: {},
      create: mod,
    });
  }
  console.log('New modules added.');
}

main().finally(() => prisma.$disconnect());

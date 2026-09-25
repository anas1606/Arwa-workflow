const { PrismaClient } = require('@prisma/client');
const CryptoJS = require('crypto-js');
const prisma = new PrismaClient();

const ENCRYPTION_SECRET = process.env.NEXT_PUBLIC_ENCRYPTION_SECRET || 'fallback_secret_do_not_use_in_prod';

function encryptString(text) {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, ENCRYPTION_SECRET).toString();
}

async function main() {
  console.log('Starting seed...');

  // 1. Create Default Modules
  const modulesToCreate = [
    { module_key: 'dashboard', name: 'Dashboard' },
    { module_key: 'customers', name: 'Customers' },
    { module_key: 'customisation', name: 'Customisation' },
    { module_key: 'products', name: 'Products' },
    { module_key: 'categories', name: 'Categories' },
    { module_key: 'units', name: 'Units' },
    { module_key: 'users', name: 'Users' },
    { module_key: 'security_roles', name: 'Security Roles' },
    { module_key: 'orders', name: 'Orders' },
    { module_key: 'production', name: 'Production' },
    { module_key: 'bom', name: 'BOM' },
    { module_key: 'packaging', name: 'Packaging' },
    { module_key: 'godown', name: 'Godown' },
    { module_key: 'stock', name: 'Stock Management' },
    { module_key: 'settings', name: 'Settings' },
  ];

  for (const mod of modulesToCreate) {
    await prisma.module.upsert({
      where: { module_key: mod.module_key },
      update: {},
      create: mod,
    });
  }
  console.log('Modules seeded.');

  // 2. Create Super Admin User (Without a Security Role)
  const encryptedPassword = encryptString('admin123'); // Default password for super admin
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      isSuperAdmin: true,
    },
    create: {
      username: 'admin',
      email: 'admin@arwa.com',
      password: encryptedPassword,
      // No security_role_id provided means they are super admin
      isActive: true,
      isSuperAdmin: true,
      createdBy: 'SYSTEM',
    },
  });
  console.log('Super Admin user created.');

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

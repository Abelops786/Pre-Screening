require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email    = process.env.SEED_ADMIN_EMAIL    || 'admin@company.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@1234!';
  const name     = process.env.SEED_ADMIN_NAME     || 'Super Admin';

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where:  { email },
    update: { passwordHash, name, role: 'SUPER_ADMIN' },
    create: { email, passwordHash, name, role: 'SUPER_ADMIN' },
  });

  console.log(`Super admin upserted:`);
  console.log(`  Email:    ${user.email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Role:     ${user.role}`);
  console.log('\nChange the default password immediately after first login!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

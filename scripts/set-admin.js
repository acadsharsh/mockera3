const { PrismaClient } = require('@prisma/client');
const { webcrypto } = require('crypto');
const path = require('path');
const { pathToFileURL } = require('url');

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

async function main() {
  const passwordModulePath = pathToFileURL(
    path.resolve(__dirname, '..', 'node_modules', 'better-auth', 'dist', 'crypto', 'password.mjs')
  ).href;
  const { hashPassword } = await import(passwordModulePath);
  const prisma = new PrismaClient();
  const email = 'acads.harsh@gmail.com'.toLowerCase();
  const plainPassword = 'harshgupta@6818';
  const passwordHash = await hashPassword(plainPassword);

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: 'Admin',
        emailVerified: true,
      },
    });
  } else if (!user.emailVerified) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
  }

  const existingAccount = await prisma.account.findFirst({
    where: { userId: user.id, providerId: 'credential' },
  });

  if (existingAccount) {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: { password: passwordHash },
    });
  } else {
    await prisma.account.create({
      data: {
        userId: user.id,
        providerId: 'credential',
        accountId: user.id,
        password: passwordHash,
      },
    });
  }

  await prisma.$disconnect();
  console.log('Admin credential set for', email);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

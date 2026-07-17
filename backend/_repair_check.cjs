const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  try {
    const count = await p.content.count();
    console.log('Content count:', count);
  } catch (e) {
    console.error('Error:', e.message?.substring(0, 200));
    process.exit(1);
  }
  await p.$disconnect();
}
main();

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const types = await p.content.groupBy({ by: ['type'], _count: true });
  console.log('Content by type:', JSON.stringify(types));
  await p.$disconnect();
}
main();

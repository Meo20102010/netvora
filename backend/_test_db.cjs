const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  try {
    const r = await p.$queryRaw`SELECT COUNT(*) as cnt FROM Content`;
    console.log('Raw query count:', r[0].cnt);
  } catch(e) { console.error('Raw error:', e.message?.substring(0,300), e.code); }

  try {
    const r = await p.content.findMany({ where: { isActive: true, isFeatured: true }, take: 2, select: { id: true, title: true } });
    console.log('Simple find:', r.length, r[0]?.title);
  } catch(e) { console.error('Simple find error:', e.message?.substring(0,300)); }

  await p.$disconnect();
}
main();

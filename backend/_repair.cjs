const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  try {
    // Try integrity check
    const result = await p.$queryRawUnsafe`PRAGMA integrity_check`;
    console.log('Integrity check:', JSON.stringify(result));
  } catch(e) {
    console.error('PRAGMA error:', e.message?.substring(0, 200));
    
    // Try VACUUM to repair
    try {
      await p.$executeRawUnsafe('VACUUM');
      console.log('VACUUM succeeded!');
    } catch(e2) {
      console.error('VACUUM error:', e2.message?.substring(0, 200));
    }
  }
  
  // Try query again after repair
  try {
    const r = await p.content.findMany({ where: { isActive: true, isFeatured: true }, take: 2, select: { id: true, title: true } });
    console.log('After repair - featured:', r.length, r[0]?.title);
  } catch(e) {
    console.error('After repair error:', e.message?.substring(0, 300));
  }
  
  await p.$disconnect();
}
main();

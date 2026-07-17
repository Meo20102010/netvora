const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  // Try reading content one by one
  let ok = 0, fail = 0;
  for (let i = 1; i <= 20600; i += 100) {
    try {
      const r = await p.content.findMany({ skip: i, take: 1, select: { id: true } });
      if (r.length > 0) ok++;
    } catch(e) {
      fail++;
      console.log(`Failed at offset ${i}:`, e.message?.substring(0, 100));
    }
  }
  console.log(`OK: ${ok}, Failed: ${fail}`);
  await p.$disconnect();
}
main();

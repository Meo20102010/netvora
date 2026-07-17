const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({ take: 3 }).then(r => {
  console.log('Users:', JSON.stringify(r, null, 2));
}).catch(e => {
  console.error('Prisma error:', e.message);
  console.error('Full:', e);
}).finally(() => p.$disconnect());

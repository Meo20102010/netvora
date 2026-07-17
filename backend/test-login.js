const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function test() {
  try {
    // Test DB connection
    const user = await prisma.user.findUnique({ where: { email: 'memo135memo1@gmail.com' } });
    console.log('User found:', !!user);
    
    if (user) {
      const valid = await bcrypt.compare('test123', user.password);
      console.log('Password valid:', valid);
      
      // Try creating a session
      try {
        const session = await prisma.userSession.create({
          data: {
            userId: user.id,
            token: 'test-token',
            refreshToken: 'test-refresh',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
        console.log('Session created:', session.id);
        await prisma.userSession.delete({ where: { id: session.id } });
        console.log('Session cleaned up');
      } catch (e) {
        console.error('Session error:', e.message);
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
    console.error('Stack:', e.stack);
  } finally {
    await prisma.$disconnect();
  }
}

test();

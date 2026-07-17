import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const app = express();
  app.use(express.json());
  
  app.post('/test-login', async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log('Login attempt:', email);
      const user = await prisma.user.findUnique({ where: { email } });
      console.log('User found:', !!user);
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      const bcrypt = require('bcryptjs');
      const valid = await bcrypt.compare(password, user.password);
      console.log('Password valid:', valid);
      
      res.json({ success: true, user: { id: user.id, role: user.role } });
    } catch (err) {
      console.error('ERROR:', err);
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  });
  
  app.listen(4001, () => console.log('Test server on 4001'));
}

test();

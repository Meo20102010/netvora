import type { NextApiRequest, NextApiResponse } from 'next';
import app from '../../server/src';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return new Promise<void>((resolve) => {
    (app as any)(req, res, () => {
      if (!res.headersSent) {
        res.status(404).json({ success: false, message: 'Not found' });
      }
      resolve();
    });
  });
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

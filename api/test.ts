import { VercelRequest, VercelResponse } from '@vercel/node';

export default async (req: VercelRequest, res: VercelResponse) => {
  return res.json({ message: 'Test endpoint works!' });
};

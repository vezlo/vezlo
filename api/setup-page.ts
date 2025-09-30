import { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'path';
import fs from 'fs';

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const setupHtmlPath = path.join(process.cwd(), 'public', 'setup.html');
    const html = fs.readFileSync(setupHtmlPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.send(html);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to load setup page',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

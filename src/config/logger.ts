import winston from 'winston';
import { existsSync, mkdirSync } from 'fs';

// Check if we're running on Vercel (read-only filesystem)
const isVercel = process.env.VERCEL === '1' || process.env.NOW_REGION;

// Only use file transports if not on Vercel
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  })
];

// Add file transports only for local development
if (!isVercel) {
  // Create logs directory if it doesn't exist
  if (!existsSync('logs')) {
    try {
      mkdirSync('logs');
    } catch (error) {
      console.warn('Could not create logs directory:', error);
    }
  }

  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'vezlo-server' },
  transports
});

export default logger;



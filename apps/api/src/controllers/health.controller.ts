import { Request, Response } from 'express';
import { storageService } from '../storage/localStorage.service';

export const getHealth = async (_req: Request, res: Response): Promise<void> => {
  const uptimeSeconds = process.uptime();
  const memoryUsage = process.memoryUsage();

  res.status(200).json({
    success: true,
    service: 'EduSync API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    system: {
      uptimeSeconds: Math.floor(uptimeSeconds),
      memoryMB: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      },
    },
    storage: {
      driver: 'local-filesystem',
      uploadDir: storageService.getBaseUploadDir(),
      maxFileSizeMB: (Number(process.env.MAX_FILE_SIZE || 10485760) / 1024 / 1024).toFixed(0),
    },
    database: {
      provider: 'Neon PostgreSQL (Prisma ORM)',
      status: process.env.DATABASE_URL ? 'configured' : 'pending_configuration',
    },
  });
};

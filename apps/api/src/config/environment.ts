import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file (supports monorepo root and apps/api directory)
const rootEnvPath = path.resolve(process.cwd(), '.env');
const appEnvPath = path.resolve(process.cwd(), 'apps/api/.env');
dotenv.config({ path: fs.existsSync(appEnvPath) ? appEnvPath : rootEnvPath });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_sample_key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_sample_key',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  database: {
    url: process.env.DATABASE_URL || '',
    directUrl: process.env.DIRECT_URL || '',
  },
  storage: {
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
};

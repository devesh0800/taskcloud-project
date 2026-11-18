import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/environment';
import healthRoutes from './routes/health.routes';
import fileRoutes from './routes/file.routes';
import authRoutes from './routes/auth.routes';
import teacherRoutes from './routes/teacher.routes';
import studentRoutes from './routes/student.routes';
import adminRoutes from './routes/admin.routes';
import profileRoutes from './routes/profile.routes';
import classRoutes from './routes/class.routes';
import assignmentRoutes from './routes/assignment.routes';
import submissionRoutes from './routes/submission.routes';
import gradeRoutes from './routes/grade.routes';
import notificationRoutes from './routes/notification.routes';
import analyticsRoutes from './routes/analytics.routes';
import reportRoutes from './routes/report.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp(): Express {
  const app = express();

  // Security headers with Helmet
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: [config.frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Body and cookie parsing
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use(cookieParser());

  // Normalize duplicate /api/v1 prefix if present
  app.use((req, _res, next) => {
    if (req.url.startsWith('/api/v1/api/v1')) {
      req.url = req.url.replace('/api/v1/api/v1', '/api/v1');
    }
    next();
  });

  // Mount API v1 routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/classes', classRoutes);
  app.use('/api/v1/assignments', assignmentRoutes);
  app.use('/api/v1/submissions', submissionRoutes);
  app.use('/api/v1/grades', gradeRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/teacher', teacherRoutes);
  app.use('/api/v1/student', studentRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/profile', profileRoutes);
  app.use('/api/v1/files', fileRoutes);
  app.use('/api/v1', healthRoutes);

  // 404 Not Found Handler
  app.use(notFoundHandler);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

import { Router } from 'express';
import { uploadFile, downloadFile } from '../controllers/file.controller';
import { uploadSingle } from '../storage/upload.middleware';
import { authenticateUser, optionalAuthenticateUser } from '../middleware/auth.middleware';

const router = Router();

// Upload a single file (Strictly requires authenticated user)
router.post('/upload', authenticateUser, uploadSingle('file'), uploadFile);

// Secure file download by category and storedFileName (Checked with optional or required auth)
router.get('/download/:category/:fileName', optionalAuthenticateUser, downloadFile);

export default router;

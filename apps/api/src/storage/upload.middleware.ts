import multer from 'multer';
import { Request } from 'express';
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, DANGEROUS_EXTENSIONS, DEFAULT_MAX_FILE_SIZE } from './file.validation';
import path from 'path';

const maxSize = Number(process.env.MAX_FILE_SIZE) || DEFAULT_MAX_FILE_SIZE;

// Multer memory storage allows validating file buffer before writing to disk
const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Deny dangerous executable files immediately
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return cb(new Error(`Security Alert: Uploading executable or script files (${ext}) is blocked.`));
  }

  // Check extension
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error(`Invalid file extension (${ext}). Allowed: PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, PNG.`));
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error(`Invalid MIME type (${file.mimetype}).`));
  }

  cb(null, true);
};

export const uploadSingle = (fieldName = 'file') =>
  multer({
    storage,
    limits: { fileSize: maxSize },
    fileFilter,
  }).single(fieldName);

export const uploadMultiple = (fieldName = 'files', maxCount = 5) =>
  multer({
    storage,
    limits: { fileSize: maxSize },
    fileFilter,
  }).array(fieldName, maxCount);

import path from 'path';

/**
 * Allowed MIME types and extensions for EduSync
 * Formats: PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, JPEG, PNG
 */
export const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.txt',
  '.jpg',
  '.jpeg',
  '.png',
]);

export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/jpeg',
  'image/png',
]);

export const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.ps1', '.vbs', '.js', '.mjs',
  '.ts', '.html', '.htm', '.php', '.py', '.rb', '.jar', '.dll', '.so',
  '.dylib', '.bin', '.com', '.msi', '.scr', '.pif'
]);

export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(originalName: string, mimeType: string, size: number): FileValidationResult {
  const ext = path.extname(originalName).toLowerCase();

  // 1. Check for dangerous extensions (no executable files)
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Executable or script files (${ext}) are strictly prohibited.`,
    };
  }

  // 2. Validate allowed extensions
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Unsupported file extension (${ext}). Allowed: PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, JPEG, PNG.`,
    };
  }

  // 3. Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      valid: false,
      error: `Unsupported MIME type (${mimeType}).`,
    };
  }

  // 4. Validate file size
  const maxSize = Number(process.env.MAX_FILE_SIZE) || DEFAULT_MAX_FILE_SIZE;
  if (size > maxSize) {
    const maxMb = (maxSize / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File size exceeds the maximum allowed limit of ${maxMb}MB.`,
    };
  }

  return { valid: true };
}

/**
 * Sanitizes original filename to prevent directory traversal and illegal characters
 */
export function sanitizeFilename(originalName: string): string {
  const baseName = path.basename(originalName);
  // Remove path traversal and dangerous characters
  return baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

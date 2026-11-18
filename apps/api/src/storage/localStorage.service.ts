import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { validateFile, sanitizeFilename } from './file.validation';

export type FileCategory = 'assignments' | 'submissions' | 'profiles' | 'resources';

export interface SavedFileMetadata {
  id: string;
  originalName: string;
  storedFileName: string;
  category: FileCategory;
  relativeFilePath: string;
  absoluteFilePath: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export interface IFileStorageService {
  saveFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    category: FileCategory
  ): Promise<SavedFileMetadata>;
  getFilePath(category: FileCategory, storedFileName: string): Promise<string>;
  deleteFile(category: FileCategory, storedFileName: string): Promise<boolean>;
  fileExists(category: FileCategory, storedFileName: string): Promise<boolean>;
}

export class LocalFileStorageService implements IFileStorageService {
  private baseUploadDir: string;

  constructor(customUploadDir?: string) {
    const configuredDir = customUploadDir || process.env.UPLOAD_DIR || 'uploads';
    if (path.isAbsolute(configuredDir)) {
      this.baseUploadDir = configuredDir;
    } else {
      // Handle both running from monorepo root or running inside apps/api
      const inAppPath = path.resolve(process.cwd(), 'apps/api', configuredDir);
      const directPath = path.resolve(process.cwd(), configuredDir);
      this.baseUploadDir = fs.existsSync(path.resolve(process.cwd(), 'apps/api')) ? inAppPath : directPath;
    }

    this.ensureDirectoriesExist();
  }

  /**
   * Ensure required subdirectories exist
   */
  private ensureDirectoriesExist(): void {
    const categories: FileCategory[] = ['assignments', 'submissions', 'profiles', 'resources'];
    for (const cat of categories) {
      const dirPath = path.join(this.baseUploadDir, cat);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
  }

  /**
   * Resolves and verifies safe target path within the base upload directory
   * Strictly prevents path traversal attacks
   */
  private getSafePath(category: FileCategory, fileName: string): string {
    const sanitizedName = path.basename(fileName);
    const categoryDir = path.resolve(this.baseUploadDir, category);
    const resolvedPath = path.resolve(categoryDir, sanitizedName);

    // Verify the resolved path is inside the category directory
    if (!resolvedPath.startsWith(categoryDir)) {
      throw new Error('Access denied: Potential path traversal attempt detected.');
    }

    return resolvedPath;
  }

  /**
   * Save uploaded file to local filesystem
   */
  async saveFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    category: FileCategory
  ): Promise<SavedFileMetadata> {
    // 1. Validate file format and size
    const validation = validateFile(originalName, mimeType, fileBuffer.length);
    if (!validation.valid) {
      throw new Error(validation.error || 'File validation failed.');
    }

    const sanitizedOriginal = sanitizeFilename(originalName);
    const extension = path.extname(sanitizedOriginal).toLowerCase();
    const uniqueId = uuidv4();
    const storedFileName = `${uniqueId}${extension}`;

    const targetPath = this.getSafePath(category, storedFileName);

    // 2. Write file to local disk
    await fs.promises.writeFile(targetPath, fileBuffer);

    // 3. Return metadata (relative storage path for DB storage)
    const relativeFilePath = path.join(category, storedFileName).replace(/\\/g, '/');

    return {
      id: uniqueId,
      originalName: sanitizedOriginal,
      storedFileName,
      category,
      relativeFilePath,
      absoluteFilePath: targetPath,
      mimeType,
      size: fileBuffer.length,
      uploadedAt: new Date(),
    };
  }

  /**
   * Retrieve validated absolute path for secure serving
   */
  async getFilePath(category: FileCategory, storedFileName: string): Promise<string> {
    const targetPath = this.getSafePath(category, storedFileName);

    if (!fs.existsSync(targetPath)) {
      throw new Error('File not found on local storage server.');
    }

    return targetPath;
  }

  /**
   * Delete file from local filesystem
   */
  async deleteFile(category: FileCategory, storedFileName: string): Promise<boolean> {
    try {
      const targetPath = this.getSafePath(category, storedFileName);
      if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
        return true;
      }
      return false;
    } catch (err) {
      console.error(`Error deleting file ${storedFileName}:`, err);
      return false;
    }
  }

  /**
   * Check if file exists on disk
   */
  async fileExists(category: FileCategory, storedFileName: string): Promise<boolean> {
    const targetPath = this.getSafePath(category, storedFileName);
    return fs.existsSync(targetPath);
  }

  /**
   * Return base upload directory path
   */
  getBaseUploadDir(): string {
    return this.baseUploadDir;
  }
}

// Export singleton instance for standard use
export const storageService = new LocalFileStorageService();

import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadsRepository {
  private readonly uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') || 'uploads';
    this.ensureUploadDirExists();
  }

  private async ensureUploadDirExists(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch (error) {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    const filename = `${uuidv4()}-${file.originalname}`;
    const filePath = path.join(this.uploadDir, filename);
    
    await fs.writeFile(filePath, file.buffer);
    
    return filename;
  }

  async getFile(filename: string): Promise<Buffer> {
    const filePath = path.join(this.uploadDir, filename);
    return fs.readFile(filePath);
  }

  async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(this.uploadDir, filename);
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
    } catch (error) {
      // File doesn't exist, just ignore
    }
  }

  getFileUrl(filename: string): string {
    return `/uploads/${filename}`;
  }
}
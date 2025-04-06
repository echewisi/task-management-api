import { Injectable } from '@nestjs/common';
import { UploadsRepository } from './uploads.repository';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadsService {
  constructor(
    private readonly uploadsRepository: UploadsRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Saves a file to the upload directory
   * @param file The file to save
   * @returns The filename of the saved file
   */
  async saveFile(file: Express.Multer.File): Promise<string> {
    return this.uploadsRepository.saveFile(file);
  }

  /**
   * Retrieves a file from the upload directory
   * @param filename The name of the file to retrieve
   * @returns The file buffer
   */
  async getFile(filename: string): Promise<Buffer> {
    return this.uploadsRepository.getFile(filename);
  }

  /**
   * Deletes a file from the upload directory
   * @param filename The name of the file to delete
   */
  async deleteFile(filename: string): Promise<void> {
    await this.uploadsRepository.deleteFile(filename);
  }

  /**
   * Gets the URL for accessing a file
   * @param filename The name of the file
   * @returns The URL for accessing the file
   */
  getFileUrl(filename: string): string {
    const baseUrl = this.configService.get('APP_URL') || '';
    const uploadUrl = this.uploadsRepository.getFileUrl(filename);
    return `${baseUrl}${uploadUrl}`;
  }

  /**
   * Checks if a file exists in the upload directory
   * @param filename The name of the file to check
   * @returns Whether the file exists
   */
  async fileExists(filename: string): Promise<boolean> {
    try {
      await this.uploadsRepository.getFile(filename);
      return true;
    } catch (error) {
      return false;
    }
  }
}
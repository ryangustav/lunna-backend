import { createWriteStream } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { ImageRepository } from '../../../domain/repositories/ImageRepository';

const pump = promisify(pipeline);

export interface UploadImageDTO {
  id: string;
  filename: string;
  mimetype: string;
  file: NodeJS.ReadableStream;
}

export interface UploadImageResult {
  success: boolean;
  filename?: string;
  error?: string;
}

export class UploadImageUseCase {
  /**
   * Creates a new UploadImageUseCase instance.
   * @param imageRepository The repository for storing image metadata.
   * @param imagesFolder The folder where images are stored.
   */
  constructor(
    private imageRepository: ImageRepository,
    private imagesFolder: string
  ) {}

  /**
   * Uploads an image to the server.
   * @param data The image data to upload.
   * @returns A result object indicating success or failure.
   */
  async execute(data: UploadImageDTO): Promise<UploadImageResult> {
    if (!data.file) {
      return { success: false, error: 'Arquivo inválido' };
    }
    
    try {
      const safeFilename = this.sanitizeFilename(data.filename);
      const filename = `${data.id}-${safeFilename}`;
      const filepath = join(this.imagesFolder, filename);
      
      const writeStream = createWriteStream(filepath);
      
      await pump(data.file, writeStream);
      
      
      await this.imageRepository.saveImageMetadata({
        id: data.id,
        filename,
        originalName: data.filename,
        mimetype: data.mimetype,
        uploadedAt: new Date()
      });
      
      return { success: true, filename };
    } catch (err) {
      console.error('Error in UploadImageUseCase:', err);
      return { success: false, error: 'Falha ao salvar a imagem' };
    }
  }

  /**
   * Sanitizes a filename to prevent security issues.
   * @param filename The filename to sanitize.
   * @returns A sanitized filename.
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .substring(0, 200);
  }
}
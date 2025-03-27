import { ImageMetadata, ImageRepository } from '../../domain/repositories/ImageRepository';
import { writeFile, readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export class FileSystemImageRepository implements ImageRepository {
  private metadataPath: string;
  private metadata: Record<string, ImageMetadata> = {};
  private filenameIndex: Record<string, string> = {};

  /**
   * Creates a new FileSystemImageRepository instance.
   * @param metadataFolder The folder where image metadata is stored.
   */
  constructor(metadataFolder: string) {
    this.metadataPath = join(metadataFolder, 'image-metadata.json');
    this.loadMetadata();
  }

  private async loadMetadata(): Promise<void> {
    try {
      if (existsSync(this.metadataPath)) {
        const data = await readFile(this.metadataPath, 'utf-8');
        this.metadata = JSON.parse(data);
        
        this.filenameIndex = {};
        for (const [id, meta] of Object.entries(this.metadata)) {
          this.filenameIndex[meta.filename] = id;
        }
      }
    } catch (err) {
      console.error('Error loading image metadata:', err);
      this.metadata = {};
      this.filenameIndex = {};
    }
  }

  private async saveMetadataFile(): Promise<void> {
    try {
      await writeFile(this.metadataPath, JSON.stringify(this.metadata, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving image metadata:', err);
    }
  }

  async saveImageMetadata(metadata: ImageMetadata): Promise<void> {
    this.metadata[metadata.id] = metadata;
    this.filenameIndex[metadata.filename] = metadata.id;
    await this.saveMetadataFile();
  }

  async findByFilename(filename: string): Promise<ImageMetadata | null> {
    const id = this.filenameIndex[filename];
    if (!id) return null;
    return this.metadata[id] || null;
  }

  async findById(id: string): Promise<ImageMetadata | null> {
    return this.metadata[id] || null;
  }

  async deleteById(id: string): Promise<boolean> {
    const metadata = this.metadata[id];
    if (!metadata) return false;
    
    delete this.filenameIndex[metadata.filename];
    delete this.metadata[id];
    await this.saveMetadataFile();
    return true;
  }
}
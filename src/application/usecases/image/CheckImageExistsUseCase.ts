import { existsSync } from 'fs';
import { join } from 'path';
import { ImageRepository } from '../../../domain/repositories/ImageRepository';

export class CheckImageExistsUseCase {
  /**
   * Creates a new CheckImageExistsUseCase instance.
   * @param imageRepository The repository for retrieving image metadata.
   * @param imagesFolder The folder where images are stored.
   */
  constructor(
    private imageRepository: ImageRepository,
    private imagesFolder: string
  ) {}

  /**
   * Checks if an image exists on the server.
   * @param filename The filename to check.
   * @returns A boolean indicating if the image exists.
   */
  async execute(filename: string): Promise<boolean> {
    try {
      
      const filepath = join(this.imagesFolder, filename);
      if (existsSync(filepath)) {
        return true;
      }
      
     
      const metadata = await this.imageRepository.findByFilename(filename);
      return !!metadata;
    } catch (err) {
      console.error('Error in CheckImageExistsUseCase:', err);
      return false;
    }
  }
}
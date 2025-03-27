import { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ImageController } from '../controllers/image.controller';
import { UploadImageUseCase } from '../../application/usecases/image/UploadImageUseCase';
import { CheckImageExistsUseCase } from '../../application/usecases/image/CheckImageExistsUseCase';
import { FileSystemImageRepository } from '../repositories/FileSystemImageRepository';

export class ImageService {
  /**
   * Initializes the image service with all required dependencies.
   * @param fastify The Fastify instance.
   * @param baseUrl The base URL for accessing images.
   * @param rootPath The root path of the application.
   */
  static init(fastify: FastifyInstance, baseUrl: string, rootPath: string): void {

    const imagesFolder = join(rootPath, 'uploads', 'backgrounds');
    const metadataFolder = join(rootPath, 'data');
    
   
    if (!existsSync(imagesFolder)) {
      mkdirSync(imagesFolder, { recursive: true });
    }
    
    if (!existsSync(metadataFolder)) {
      mkdirSync(metadataFolder, { recursive: true });
    }
    
    
    fastify.register(fastifyStatic, {
      root: imagesFolder,
      prefix: '/backgrounds/',
      decorateReply: false
    });
    
  
    const imageRepository = new FileSystemImageRepository(metadataFolder);
    

    const uploadImageUseCase = new UploadImageUseCase(imageRepository, imagesFolder);
    const checkImageExistsUseCase = new CheckImageExistsUseCase(imageRepository, imagesFolder);
    
    const imageController = new ImageController(
      uploadImageUseCase,
      checkImageExistsUseCase,
      baseUrl
    );
    
    imageController.registerRoutes(fastify);
  }
}
export interface ImageMetadata {
    id: string;
    filename: string;
    originalName: string;
    mimetype: string;
    uploadedAt: Date;
  }
  
  export interface ImageRepository {
    saveImageMetadata(metadata: ImageMetadata): Promise<void>;
    findByFilename(filename: string): Promise<ImageMetadata | null>;
    findById(id: string): Promise<ImageMetadata | null>;
    deleteById(id: string): Promise<boolean>;
  }
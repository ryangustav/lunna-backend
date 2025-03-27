import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UploadImageUseCase } from '../../application/usecases/image/UploadImageUseCase';
import { CheckImageExistsUseCase } from '../../application/usecases/image/CheckImageExistsUseCase';
import { pipeline } from 'stream';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const pump = promisify(pipeline);

interface CheckImageParams {
  filename: string;
}

interface QueryParams {
  category?: string;
  name?: string;
}


export class ImageController {
  private uploadedImages: Map<string, number> = new Map();

  constructor(
    private uploadImageUseCase: UploadImageUseCase,
    private checkImageExistsUseCase: CheckImageExistsUseCase,
    private baseUrl: string
  ) {}

  registerRoutes(fastify: FastifyInstance) {
    fastify.get('/:category/:filename', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { category, filename } = request.params as { category: string; filename: string };
    
        if (!filename.endsWith('.png')) {
          return reply.status(400).send({ error: 'Apenas imagens PNG são permitidas' });
        }
    
        const rootPath = process.cwd();
        const filePath = path.join(rootPath, 'src', 'uploads', category, filename);
        
        console.log('Attempting to serve file from:', filePath);
        
        if (!fs.existsSync(filePath)) {
          console.log('File not found at path:', filePath);
          return reply.status(404).send({ error: 'Imagem não encontrada' });
        }
    
        reply.type('image/png');
        const stream = fs.createReadStream(filePath);
        return reply.send(stream); 
      } catch (error) {
        console.error('Erro ao servir imagem:', error);
        return reply.status(500).send({ error: 'Erro interno do servidor' });
      }
    });
    fastify.post('/upload-image', async (request: FastifyRequest, reply: FastifyReply) => {
   
      try {
      
        const data = await request.file();
        
        if (!data) {
          return reply.status(400).send({ error: 'Arquivo não encontrado' });
        }
        
        
        const category = (request.query as QueryParams).category as string || request.headers['x-category'] as string;
        const name = (request.query as QueryParams).name as string || request.headers['x-name'] as string;
        
        
        
        if (!category || !name) {
          return reply.status(400).send({ error: 'Categoria e nome são obrigatórios (envie via query params ou headers)' });
        }
        
        if (data.mimetype !== 'image/png') {
          return reply.status(400).send({ error: 'Apenas imagens PNG são aceitas' });
        }
        
        const allowedCategories = ['insignia', 'background', 'base'];
        if (!allowedCategories.includes(category)) {
          return reply.status(400).send({ error: 'Categoria inválida' });
        }
        
        const filename = `${category}_${name}.png`;
        const directory = path.join('src','uploads', `${category}s`);
        const filePath = path.join(directory, filename);
        
        if (!fs.existsSync(directory)) {
          fs.mkdirSync(directory, { recursive: true });
        }
        
  
        await pump(data.file, fs.createWriteStream(filePath));
      
        
        return reply.status(201).send({ success: true, url: `${this.baseUrl}/${category}s/${filename}` });
      } catch (error) {
        console.error('Erro ao fazer upload da imagem:', error);
        return reply.status(500).send({ error: 'Erro interno do servidor' });
      }
    });
    

    fastify.head('/search/:filename', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { filename } = request.params as CheckImageParams;

        if (!filename) {
          return reply.status(400).send({ error: 'Nome do arquivo é obrigatório' });
        }

        const exists = await this.checkImageExistsUseCase.execute(filename);

        return exists ? reply.status(200).send() : reply.status(404).send();
      } catch (error) {
        console.error('Erro ao verificar imagem:', error);
        return reply.status(500).send({ error: 'Erro interno do servidor' });
      }
    });

    fastify.delete('/:category/:filename', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { category, filename } = request.params as { category: string; filename: string };
    
        const allowedCategories = ['insignias', 'backgrounds', 'bases'];
        if (!allowedCategories.includes(category)) {
          return reply.status(400).send({ error: 'Categoria inválida' });
        }
    
        const rootPath = process.cwd();
        const filePath = path.join(rootPath, 'src', 'uploads', category, filename);
        
        console.log('Attempting to delete file from:', filePath);
        
        if (!fs.existsSync(filePath)) {
          console.log('File not found at path:', filePath);
          return reply.status(404).send({ error: 'Imagem não encontrada' });
        }
    
        fs.unlinkSync(filePath);
    
        return reply.status(200).send({ success: true, message: 'Imagem deletada com sucesso' });
      } catch (error) {
        console.error('Erro ao excluir imagem:', error);
        return reply.status(500).send({ error: 'Erro interno do servidor' });
      }
    });

    fastify.post('/cleanup-images', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const now = Date.now();
        const entriesToClear = [...this.uploadedImages.entries()]
          .filter(([_, timestamp]) => now - timestamp > 30 * 24 * 60 * 60 * 1000);

        let deletedCount = 0;
        for (const [imageId] of entriesToClear) {
          this.uploadedImages.delete(imageId);
          deletedCount++;
        }

        return reply.send({ success: true, deletedCount });
      } catch (error) {
        console.error('Erro ao limpar imagens:', error);
        return reply.status(500).send({ error: 'Erro interno do servidor' });
      }
    });
  }
}

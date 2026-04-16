import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaRPGRepository } from '../repositories/prisma-rpg.repository';

export class RPGController {
  constructor(private rpgRepository: PrismaRPGRepository) {}

  registerRoutes(app: FastifyInstance) {
    app.get('/rpg/inventory', this.getInventory.bind(this));
    app.get('/rpg/items', this.getItems.bind(this));
    app.post('/rpg/equip/:id', this.toggleEquip.bind(this));
    
    // Admin/Test routes
    app.post('/rpg/admin/seed', this.seedItems.bind(this));
    app.post('/rpg/admin/give/:itemId', this.giveItem.bind(this));
  }

  async getInventory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.id;
      const inventory = await this.rpgRepository.getUserInventory(userId);
      return reply.send({ success: true, data: inventory });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getItems(request: FastifyRequest, reply: FastifyReply) {
    try {
      const items = await this.rpgRepository.getAllItems();
      return reply.send({ success: true, data: items });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async toggleEquip(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params as { id: string };
      const updatedItem = await this.rpgRepository.toggleEquip(id, userId);
      return reply.send({ success: true, data: updatedItem });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  async giveItem(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.id;
      const { itemId } = request.params as { itemId: string };
      const userItem = await this.rpgRepository.giveItemToUser(userId, itemId);
      return reply.send({ success: true, data: userItem });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async seedItems(request: FastifyRequest, reply: FastifyReply) {
    try {
      const mockItems = [
        {
          name: "Espada da Estrela Cadente",
          description: "Uma lâmina lendária forjada com restos de um meteoro que caiu nas montanhas lunares.",
          rarity: "Lendário",
          category: "Equipamentos",
          icon: "/sprites/sword_legendary.png",
          stats: { atk: 150, spd: 15 }
        },
        {
          name: "Escudo de Obsidiana",
          description: "Um escudo maciço capaz de absorver impactos de ataques mágicos e físicos.",
          rarity: "Épico",
          category: "Equipamentos",
          icon: "/sprites/shield_obsidian.png",
          stats: { def: 120, res: 40 }
        },
        {
          name: "Poção de Vida",
          description: "Restaura instantaneamente uma grande parte da vida do portador.",
          rarity: "Comum",
          category: "Consumíveis",
          icon: "/sprites/potion_health.png",
          stats: { heal: 500 }
        },
        {
          name: "Anel de Mana",
          description: "Um anel encantado que acelera a regeneração de energia espiritual.",
          rarity: "Raro",
          category: "Acessórios",
          icon: "/sprites/ring_mana.png",
          stats: { mgen: 5 }
        }
      ];

      for (const item of mockItems) {
        await this.rpgRepository.createItem(item);
      }

      return reply.send({ success: true, message: "Itens semeados com sucesso" });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }
}

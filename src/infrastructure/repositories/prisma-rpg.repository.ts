import { PrismaClient } from '@prisma/client';

export class PrismaRPGRepository {
  constructor(private prisma: PrismaClient) {}

  async getUserInventory(userId: string) {
    const userItems = await this.prisma.userItem.findMany({
      where: { userId },
      orderBy: { acquiredAt: 'desc' },
    });

    const items = await this.prisma.item.findMany({
      where: {
        id: { in: userItems.map(ui => ui.itemId) }
      }
    });

    // Combine user relationship with item data
    return userItems.map(ui => {
      const itemData = items.find(i => i.id === ui.itemId);
      return {
        ...ui,
        item: itemData
      };
    });
  }

  async getAllItems() {
    return this.prisma.item.findMany({
      where: { active: true }
    });
  }

  async giveItemToUser(userId: string, itemId: string) {
    return this.prisma.userItem.create({
      data: {
        userId,
        itemId,
        quantity: 1,
        equipped: false
      }
    });
  }

  async toggleEquip(userItemId: string, userId: string) {
    const userItem = await this.prisma.userItem.findFirst({
      where: { id: userItemId, userId }
    });

    if (!userItem) throw new Error('Item não encontrado no inventário');

    // Desequipar outros itens da mesma categoria? 
    // Por enquanto apenas alterna o estado deste item
    return this.prisma.userItem.update({
      where: { id: userItemId },
      data: { equipped: !userItem.equipped }
    });
  }

  async createItem(data: any) {
    return this.prisma.item.create({
      data
    });
  }
}

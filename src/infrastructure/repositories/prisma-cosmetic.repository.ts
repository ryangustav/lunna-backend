import { PrismaClient } from "@prisma/client";

export interface CosmeticData {
  id: string;
  name: string;
  type: string;
  rarity: string;
  asset_url: string;
  is_animated: boolean;
  metadata?: any;
}

export class PrismaCosmeticRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<CosmeticData | null> {
    return this.prisma.cosmetic.findUnique({
      where: { id }
    });
  }

  async getAll(): Promise<CosmeticData[]> {
    return this.prisma.cosmetic.findMany();
  }

  async getByCategory(type: string): Promise<CosmeticData[]> {
    return this.prisma.cosmetic.findMany({
      where: { type }
    });
  }
}

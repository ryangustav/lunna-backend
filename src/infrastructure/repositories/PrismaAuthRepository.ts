import { PrismaClient } from '@prisma/client';

export class PrismaAuthRepository {
  constructor(private prisma: PrismaClient) {}

  async saveToken(userId: string, accessToken: string, refreshToken: string, username?: string, email?: string) {
    return this.prisma.auth.upsert({
      where: { userId },
      update: {
        accessToken,
        refreshToken,
        username,
        email,
        authenticatedAt: new Date()
      },
      create: {
        userId,
        accessToken,
        refreshToken,
        username,
        email,
        hasAuthenticated: true
      }
    });
  }

  async getToken(userId: string) {
    return this.prisma.auth.findUnique({
      where: { userId }
    });
  }

  async deleteToken(userId: string) {
    return this.prisma.auth.delete({
      where: { userId }
    });
  }
}

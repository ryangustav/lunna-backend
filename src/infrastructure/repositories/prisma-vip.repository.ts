import { PrismaClient } from "@prisma/client";
import { VipTier, VipUser } from "../../domain/entities/vip";
import { VipRepository } from "./vip.repository";

export class PrismaVipRepository implements VipRepository {
    [x: string]: any;
    constructor(private prisma: PrismaClient) {}
  

    /**
     * Find a VIP tier by name
     * @param name The name of the VIP tier
     * @returns The VIP tier if found, otherwise null
     */
    async findTierByName(name: string): Promise<VipTier | null> {
      return this.prisma.vipTier.findFirst({
        where: { name }
      });
    }

  
    /**
     * Find a VIP tier by ID
     * @param id The ID of the VIP tier
     * @returns The VIP tier if found, otherwise null
     */
    async findTierById(id: string): Promise<VipTier | null> {
      return this.prisma.vipTier.findUnique({
        where: { id }
      });
    }
  
    /**
     * Get all VIP tiers ordered by price ascending
     * @returns An array of VIP tiers
     */
    async getAllTiers(): Promise<VipTier[]> {
      return this.prisma.vipTier.findMany({
        orderBy: { price: 'asc' }
      });
    }
  
    /**
     * Updates the VIP status of a user.
     * 
     * @param userId - The ID of the user.
     * @param tier - The VIP tier to be assigned to the user.
     * @param expiryTimestamp - The timestamp when the VIP status expires.
     * 
     * Updates the user's record to reflect their VIP status, sets the VIP tier name,
     * updates the expiration timestamp, and increments the user's coin balance by the
     * number of coins associated with the VIP tier.
     * 
     * @returns A promise that resolves when the update is complete.
     */

    async updateUserVip(userId: string, tier: VipTier, expiryTimestamp: number): Promise<void> {
      await this.prisma.lunarCoins.update({
        where: { id: userId },
        data: {
          isVip: true,
          vip_type: tier.name,
          vip_timestamp: expiryTimestamp,
          coins: {
            increment: tier.coins
          }
        }
      });
    }
  
    /**
     * Deactivates a user's VIP status.
     * 
     * @param userId - The ID of the user to be deactivated.
     * 
     * Sets the user's VIP status to false, sets the VIP tier name to 'null',
     * sets the expiration timestamp to -1, and does not modify the user's
     * coin balance.
     * 
     * @returns A promise that resolves when the update is complete.
     */
    async deactivateUserVip(userId: string): Promise<void> {
      await this.prisma.lunarCoins.update({
        where: { id: userId },
        data: {
          isVip: false,
          vip_type: 'null',
          vip_timestamp: -1
        }
      });
    }
  
    /**
     * Updates a user's auto-renewal status for their VIP subscription.
     * 
     * @param userId - The ID of the user whose auto-renewal status is to be updated.
     * @param autoRenew - The new auto-renewal status. If true, the user will be
     * automatically charged for VIP when their subscription expires. If false, the
     * user will not be automatically charged when their subscription expires.
     * 
     * @returns A promise that resolves when the update is complete.
     */
    async updateAutoRenewal(userId: string, autoRenew: boolean): Promise<void> {
      await this.prisma.lunarCoins.update({
        where: { id: userId },
        data: {
          autoRenew
        }
      });
    }
  
    /**
     * Finds VIP users whose subscription is expiring by the given threshold timestamp.
     *
     * @param thresholdTimestamp - The timestamp used as a threshold for determining
     *                             expiring subscriptions. VIP users with a
     *                             subscription timestamp less than or equal to
     *                             this value are considered expiring.
     * 
     * @returns A promise that resolves to an array of VIPUser objects representing
     *          users with expiring VIP subscriptions.
     */

    async findExpiringVips(thresholdTimestamp: number): Promise<VipUser[]> {
      return this.prisma.lunarCoins.findMany({
        where: {
          isVip: true,
          vip_timestamp: {
            lte: thresholdTimestamp
          }
        },
        select: {
          user_id: true,
          isVip: true,
          vip_type: true,
          vip_timestamp: true,
          autoRenew: true,
          coins: true
        }
      });
    }
  }
  
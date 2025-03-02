import { PrismaTransactionRepository } from "../../../infrastructure/repositories/prisma-transaction.repository";
import { VipRepository } from "../../../infrastructure/repositories/vip.repository";
import { NotificationService } from "../../../infrastructure/services/notification.service";
import { PaymentStatus } from "../../../domain/types/transaction.types";

export class ActivateVipUseCase {
  /**
   * Creates a new ActivateVipUseCase instance
   * @param vipRepository The VipRepository instance to use
   * @param transactionRepository The PrismaTransactionRepository instance to use
   * @param notificationService The NotificationService instance to use
   */
    constructor(
      private vipRepository: VipRepository,
      private transactionRepository: PrismaTransactionRepository,
      private notificationService: NotificationService
    ) {}
  
  /**
   * Activate a user's VIP status for the given tier.
   * @param params Object containing the user ID, tier ID, and transaction ID.
   * @returns A promise that resolves when the update is complete.
   * @throws {Error} If the VIP tier is not found.
   */
    async execute(params: {
      userId: string;
      tierId: string;
      transactionId: string;
    }): Promise<void> {
      const tier = await this.vipRepository.findTierById(params.tierId);
      if (!tier) throw new Error('VIP tier not found');
  
      const now = Math.floor(Date.now() / 1000);
      const expiryTimestamp = now + (tier.duration * 24 * 60 * 60);
  
      await this.transactionRepository.create({
        user_id: params.userId,
        type: 'VIP',
        amount: tier.price,
        paymentId: params.transactionId,
        status: 'PENDING' as PaymentStatus,
      });
  
      await this.vipRepository.updateUserVip(params.userId, tier, expiryTimestamp);
      
      await this.transactionRepository.updateStatus(params.transactionId, 'COMPLETED' as PaymentStatus);
      
      await this.notificationService.notifyVipPurchase(params.userId, tier.name);
    }
  }
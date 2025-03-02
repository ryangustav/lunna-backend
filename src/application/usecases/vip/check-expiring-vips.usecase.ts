import { LoggerService } from "../../../domain/entities/logger";
import { VipUser } from "../../../domain/entities/vip";
import { VipRepository } from "../../../infrastructure/repositories/vip.repository";
import { PaymentGateway } from "../../../infrastructure/services/payment.gateway";

export class CheckExpiringVipsUseCase {
  /**
   * Constructs a new instance of the CheckExpiringVipsUseCase.
   * 
   * @param vipRepository - The repository to use for accessing VIP data.
   * @param paymentGateway - The payment gateway to use for processing payments.
   * @param logger - The logger to use for logging messages.
   */
    constructor(
      private vipRepository: VipRepository,
      private paymentGateway: PaymentGateway,
      private logger: LoggerService
    ) {}
  
/**
 * Checks for users whose VIP is about to expire and either renews it or deactivates it.
 * 
 * @param daysThreshold - The number of days before expiration to consider a VIP as "expiring". Defaults to 3.
 * @returns An object containing the number of renewals processed and the number of users deactivated.
 */
    async execute(daysThreshold: number = 3): Promise<{
      renewalsProcessed: number;
      deactivated: number;
    }> {
      const now = Math.floor(Date.now() / 1000);
      const thresholdTimestamp = now + (daysThreshold * 24 * 60 * 60);
  
      const expiringVips = await this.vipRepository.findExpiringVips(thresholdTimestamp);
      
      let renewalsProcessed = 0;
      let deactivated = 0;
  
      for (const user of expiringVips) {
        try {
          if (user.autoRenew) {
            await this.processRenewal(user);
            renewalsProcessed++;
          } else if (user.vip_timestamp < now) {
            await this.vipRepository.deactivateUserVip(user.user_id);
            deactivated++;
          }
        } catch (error) {
          this.logger.error('Error processing VIP user', {
            userId: user.user_id,
            error
          });
        }
      }
  
      return { renewalsProcessed, deactivated };
    }
  
/**
 * Processes the renewal of a VIP subscription for a given user.
 * 
 * @param user - The VIP user whose subscription is to be renewed.
 * 
 * Retrieves the VIP tier information based on the user's current VIP type.
 * If the tier is found, it creates a checkout session for payment processing
 * using the payment gateway. Throws an error if the VIP tier is not found.
 */

    private async processRenewal(user: VipUser): Promise<void> {
      const tier = await this.vipRepository.findTierByName(user.vip_type);
      if (!tier) throw new Error(`VIP tier not found: ${user.vip_type}`);
  
      await this.paymentGateway.createCheckoutSession({
        userId: user.user_id,
        amount: tier.price,
        type: 'VIP',
        metadata: {
          tierId: tier.id,
          isAutoRenewal: 'true'
        }
      });
    }
  }
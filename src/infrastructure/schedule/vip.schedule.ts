import { CheckExpiringVipsUseCase } from "../../application/usecases/vip/check-expiring-vips.usecase";
import cron from 'node-cron';

export class VipScheduler {
    constructor(private checkExpiringVips: CheckExpiringVipsUseCase) {}
  
  /**
   * Starts the VIP check job. This job is scheduled to run daily at 00:00 UTC.
   * When the job is run, it will execute the CheckExpiringVipsUseCase and log
   * the result to the console. If an error occurs, it will be logged to the
   * console.
   */
    start(): void {
      cron.schedule('0 0 * * *', async () => {
        try {
          const result = await this.checkExpiringVips.execute();
          console.log('VIP check completed:', result);
        } catch (error) {
          console.error('Error in VIP check:', error);
        }
      });
    }
  }
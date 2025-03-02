import axios from "axios";
import { NotificationService } from "./notification.service";

export class DiscordNotificationService implements NotificationService {
    constructor(private webhookUrl: string) {}
    notifyVipExpiration(userId: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
  
    async notifyVipPurchase(userId: string, tierName: string): Promise<void> {
      await axios.post(this.webhookUrl, {
        content: `<:gold_donator:1053256617518440478> | O usuario <@${userId}> (\`${userId}\`) acaba de virar vip ${tierName}!`
      });
    }
  }
export interface NotificationService {
    notifyVipPurchase(userId: string, tierName: string): Promise<void>;
    notifyVipExpiration(userId: string): Promise<void>;
  }
  
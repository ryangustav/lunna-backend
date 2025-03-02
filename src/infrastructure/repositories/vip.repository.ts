import { VipTier, VipUser } from "../../domain/entities/vip";


export interface VipRepository {
    findTierByName(name: string): Promise<VipTier | null>;
    findTierById(id: string): Promise<VipTier | null>;
    getAllTiers(): Promise<VipTier[]>;
    updateUserVip(userId: string, tier: VipTier, expiryTimestamp: number): Promise<void>;
    deactivateUserVip(userId: string): Promise<void>;
    updateAutoRenewal(userId: string, autoRenew: boolean): Promise<void>;
    findExpiringVips(thresholdTimestamp: number): Promise<VipUser[]>;
  }
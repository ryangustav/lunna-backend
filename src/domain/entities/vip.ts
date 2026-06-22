export interface VipTier {
    id: string;
    name: string;
    price: number;
    duration: number;
    coins: number;
    benefits: string[];
    frame_id?: string | null;
    badge_id?: string | null;
    daily_bonus?: number;
  }
  
  export interface VipUser {
    user_id: string;
    isVip: boolean;
    vip_type: string;
    vip_timestamp: number;
    autoRenew: boolean;
    coins: number;
    equipped_frame_id?: string | null;
    equipped_badge_id?: string | null;
    cosmetic_inventory?: string[];
  }
  
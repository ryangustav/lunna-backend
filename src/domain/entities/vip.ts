export interface VipTier {
    id: string;
    name: string;
    price: number;
    duration: number;
    coins: number;
  }
  
  export interface VipUser {
    user_id: string;
    isVip: boolean;
    vip_type: string;
    vip_timestamp: number;
    autoRenew: boolean;
    coins: number;
  }
  
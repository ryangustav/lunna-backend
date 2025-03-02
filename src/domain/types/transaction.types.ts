export type TransactionType = 'VIP' | 'COINS' | 'SUBSCRIPTION';

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface Transaction {
  id: string;
  productName?: string;
  description?: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  paymentId: string | null;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}
type TransactionType = string;
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED';


export interface Transaction {
  id: string;
  user_id: string; 
  type: TransactionType;
  amount: number;
  paymentId: string | null;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}
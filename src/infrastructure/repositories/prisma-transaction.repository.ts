import { PrismaClient, TransactionType as PrismaTransactionType } from '@prisma/client';
import { Transaction, TransactionType, PaymentStatus } from '../../domain/types/transaction.types';

export class PrismaTransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new transaction in the database
   * @param params Object containing the transaction parameters
   * @returns The created transaction
   */
  async create(params: {
    user_id: string;
    productName?: string | "Transaction";
    description?: string | "Description";
    type: TransactionType;
    amount: number;
    paymentId: string;
    status: PaymentStatus;
  }): Promise<Transaction> {

    console.log(params.user_id)
    const transaction = await this.prisma.transaction.create({
      data: {
        userId: params.user_id,
        name: params?.productName as string,
        description: params?.description as string,
        type: params.type as PrismaTransactionType,
        amount: params.amount,
        paymentId: params.paymentId,
        status: params.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return this.mapToTransaction(transaction);
  }

  /**
   * Find a transaction by ID
   * @param id The ID of the transaction
   * @returns The transaction if found, otherwise null
   */
  async findById(id: string): Promise<Transaction | null> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    return transaction ? this.mapToTransaction(transaction) : null;
  }

  /**
   * Find a transaction by its payment ID
   * @param paymentId The payment ID to search for
   * @returns The transaction if found, otherwise null
   */
  async findByPaymentId(paymentId: string): Promise<Transaction | null> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { paymentId },
    });

    return transaction ? this.mapToTransaction(transaction) : null;
  }

  /**
   * Find all transactions for a given user, with optional filtering and pagination
   * @param user_id The ID of the user to search for
   * @param options Optional parameters, containing:
   *   - limit: The maximum number of transactions to return
   *   - offset: The number of transactions to skip before starting the list
   *   - type: The type of transaction to filter by
   *   - status: The status of the transaction to filter by
   * @returns A list of transactions matching the given criteria
   */
  async findByUserId(
    user_id: string,
    options?: {
      limit?: number;
      offset?: number;
      type?: TransactionType;
      status?: PaymentStatus;
    }
  ): Promise<Transaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId: user_id,
        ...(options?.type && { type: options.type as PrismaTransactionType }),
        ...(options?.status && { status: options.status }),
      },
      take: options?.limit,
      skip: options?.offset,
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map(this.mapToTransaction);
  }

  /**
   * Update the status of a transaction by its ID.
   * @param transactionId The ID of the transaction to update.
   * @param status The new status to set for the transaction.
   * @returns A promise that resolves when the update is complete.
   */

  async updateStatus(transactionId: string, status: PaymentStatus): Promise<void> {
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Retrieve a set of statistics about a user's transactions.
   * @param user_id The ID of the user to retrieve statistics for.
   * @returns A promise that resolves with an object containing the following properties:
   *   - totalSpent: The total amount spent by the user.
   *   - transactionCount: The total number of transactions made by the user.
   *   - lastTransaction: The most recent transaction made by the user, or null if the user has no transactions.
   */
  async getTransactionStats(user_id: string): Promise<{
    totalSpent: number;
    transactionCount: number;
    lastTransaction: Transaction | null;
  }> {
    const [totalResult, count, lastTransaction] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          userId: user_id,
          status: PaymentStatus.COMPLETED,
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.transaction.count({
        where: { userId: user_id },
      }),
      this.prisma.transaction.findFirst({
        where: { userId: user_id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      totalSpent: totalResult._sum.amount || 0,
      transactionCount: count,
      lastTransaction: lastTransaction ? this.mapToTransaction(lastTransaction) : null,
    };
  }

  /**
   * Maps a Prisma transaction entity to our domain entity.
   * @param data The Prisma transaction entity.
   * @returns The mapped domain entity.
   * @private
   */
  private mapToTransaction(data: any): Transaction {
    return {
      id: data.id,
      user_id: data.userId,
      type: data.type as TransactionType,
      amount: data.amount,
      paymentId: data.paymentId,
      status: data.status as PaymentStatus,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
export interface ManualDepositNotificationDto {
  depositId: string;
  senderWalletAddress: string;
  transactionHash: string;
  transactionId?: string; // Add this field too
  amountSent: number;
  email: string;
  walletId: string;
}
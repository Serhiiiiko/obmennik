export interface CryptoPaymentNotificationDto {
    depositId: string;
    senderWalletAddress: string;
    transactionHash: string;
    amountSent: number;
}
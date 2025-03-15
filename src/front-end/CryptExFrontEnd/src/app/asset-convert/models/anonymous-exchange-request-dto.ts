export interface AnonymousExchangeRequestDto {
    sourceWalletId: string;
    destinationWalletId: string;
    amount: number;
    userEmail: string;
    destinationWalletAddress: string;
    senderWalletAddress: string;  // Added this field
  }
  
  export interface AnonymousExchangeConfirmationDto {
    exchangeId: string;
    transactionHash: string;
    senderWalletAddress: string;
  }
  
  export interface AnonymousExchangeResponseDto {
    id: string;
    sourceWalletTicker: string;
    destinationWalletTicker: string;
    sourceAmount: number;
    destinationAmount: number;
    exchangeRate: number;
    adminWalletAddress: string;
    status: number;
  }
using System;

namespace CryptExApi.Models.DTO
{
    public class CryptoPaymentNotificationDto
    {
        public Guid DepositId { get; set; }
        public string SenderWalletAddress { get; set; }
        public string TransactionHash { get; set; }
        public decimal AmountSent { get; set; }
    }
}

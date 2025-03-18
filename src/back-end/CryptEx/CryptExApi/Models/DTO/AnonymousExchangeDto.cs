using System;

namespace CryptExApi.Models.DTO
{
    public class AnonymousExchangeRequestDto
    {
        public Guid SourceWalletId { get; set; }
        public Guid DestinationWalletId { get; set; }
        public decimal Amount { get; set; }
        public string UserEmail { get; set; }
        public string DestinationWalletAddress { get; set; }
    }

    public class AnonymousExchangeConfirmationDto
    {
        public Guid ExchangeId { get; set; }
        public string TransactionHash { get; set; }
        public string SenderWalletAddress { get; set; }
    }

    public class AnonymousExchangeResponseDto
    {
        public Guid Id { get; set; }
        public string SourceWalletTicker { get; set; }
        public string DestinationWalletTicker { get; set; }
        public decimal SourceAmount { get; set; }
        public decimal DestinationAmount { get; set; }
        public decimal ExchangeRate { get; set; }
        public string AdminWalletAddress { get; set; }
        public PaymentStatus Status { get; set; }
        public string UserEmail { get; internal set; }
    }
}
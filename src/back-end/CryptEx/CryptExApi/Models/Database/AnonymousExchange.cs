using System;
using System.ComponentModel.DataAnnotations;

namespace CryptExApi.Models.Database
{
    public class AnonymousExchange
    {
        public Guid Id { get; set; }

        [Required]
        public string UserEmail { get; set; }

        [Required]
        public string DestinationWalletAddress { get; set; }

        [Required]
        public string SenderWalletAddress { get; set; }

        public string TransactionHash { get; set; }

        public decimal SourceAmount { get; set; }

        public decimal DestinationAmount { get; set; }

        public decimal ExchangeRate { get; set; }

        public Guid SourceWalletId { get; set; }
        public Wallet SourceWallet { get; set; }

        public Guid DestinationWalletId { get; set; }
        public Wallet DestinationWallet { get; set; }

        public DateTime CreationDate { get; set; } = DateTime.UtcNow;

        public DateTime? CompletionDate { get; set; }

        public PaymentStatus Status { get; set; } = PaymentStatus.AwaitingVerification;

        public string AdminNotes { get; set; }
    }
}
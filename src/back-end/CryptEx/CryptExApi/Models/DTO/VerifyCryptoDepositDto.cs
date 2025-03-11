using System;

namespace CryptExApi.Models.DTO
{
    public class VerifyCryptoDepositDto
    {
        public Guid DepositId { get; set; }
        public bool IsVerified { get; set; }
        public decimal FinalAmount { get; set; }
        public string AdminNotes { get; set; }
    }
}

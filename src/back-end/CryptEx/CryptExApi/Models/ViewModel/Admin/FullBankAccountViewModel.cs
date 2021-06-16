﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CryptExApi.Models.Database;

namespace CryptExApi.Models.ViewModel.Admin
{
    public class FullBankAccountViewModel
    {
        public Guid Id { get; set; }

        public string Iban { get; set; }

        public DateTime CreationDate { get; set; }

        /// <summary>When the bank account was approved/refused.</summary>
        public DateTime DecisionDate { get; set; }

        public BankAccountStatus Status { get; set; }

        public UserViewModel User { get; set; }

        public Guid UserId { get; set; }

        public static FullBankAccountViewModel FromBankAccount(BankAccount bankAccount) => new()
        {
            Id = bankAccount.Id,
            Iban = bankAccount.Iban,
            Status = bankAccount.Status,
            CreationDate = bankAccount.CreationDate,
            DecisionDate = bankAccount.DecisionDate,
            User = UserViewModel.FromAppUser(bankAccount.User),
            UserId = bankAccount.UserId
        };
    }
}

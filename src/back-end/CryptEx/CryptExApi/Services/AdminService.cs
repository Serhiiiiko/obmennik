﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CryptExApi.Models;
using CryptExApi.Models.Database;
using CryptExApi.Models.ViewModel;
using CryptExApi.Models.ViewModel.Admin;
using CryptExApi.Models.ViewModel.AssetConvert;
using CryptExApi.Models.ViewModel.Payment;
using CryptExApi.Repositories;

namespace CryptExApi.Services
{
    public interface IAdminService
    {
        Task<List<UserViewModel>> SearchUser(string query);

        Task<StatsViewModel> GetStats();

        Task<List<FullDepositViewModel>> GetAllDeposits(Guid? userId, PaymentStatus? status = null, WalletType type = WalletType.Fiat);

        Task SetPaymentStatus(Guid id, PaymentStatus status);

        Task SetPaymentStatus(string sessionId, PaymentStatus status);

        Task SetPaymentAmount(Guid id, decimal amount);

        Task<List<FullBankAccountViewModel>> GetPendingBankAccounts();

        Task SetBankAccountStatus(Guid id, BankAccountStatus status);
        Task SetWalletAddress(Guid walletId, string address);

    }

    public class AdminService : IAdminService
    {
        private readonly IStripeRepository stripeRepo;
        private readonly IAdminRepository adminRepo;

        public AdminService(IStripeRepository stripeRepo, IAdminRepository adminRepo)
        {
            this.stripeRepo = stripeRepo;
            this.adminRepo = adminRepo;
        }

        public async Task<List<UserViewModel>> SearchUser(string query)
        {
            return await adminRepo.SearchUser(query);
        }

        public async Task<StatsViewModel> GetStats()
        {
            return await adminRepo.GetStats();
        }

        public async Task<List<FullDepositViewModel>> GetAllDeposits(Guid? userId, PaymentStatus? status = null, WalletType type = WalletType.Fiat)
        {
            return await adminRepo.GetAllDeposits(userId, status, type);
        }

        public async Task SetPaymentStatus(Guid sessionId, PaymentStatus status)
        {
            await adminRepo.SetCryptoDepositStatus(sessionId, status);
        }

        public async Task SetPaymentStatus(string sessionId, PaymentStatus status)
        {
            await stripeRepo.SetDepositStatus(sessionId, status);
        }

        public async Task SetPaymentAmount(Guid id, decimal amount)
        {
            await adminRepo.SetDepositAmount(id, amount);
        }

        public async Task<List<FullBankAccountViewModel>> GetPendingBankAccounts()
        {
            return await adminRepo.GetPendingBankAccounts();
        }

        public async Task SetBankAccountStatus(Guid id, BankAccountStatus status)
        {
            await adminRepo.SetBankAccountStatus(id, status);
        }
        public async Task SetWalletAddress(Guid walletId, string address)
        {
            await adminRepo.SetWalletAddress(walletId, address);
        }
    }
}

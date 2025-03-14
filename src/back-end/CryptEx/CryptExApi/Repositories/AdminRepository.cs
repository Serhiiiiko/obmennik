﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CryptExApi.Data;
using CryptExApi.Exceptions;
using CryptExApi.Models;
using CryptExApi.Models.Database;
using CryptExApi.Models.DTO;
using CryptExApi.Models.ViewModel;
using CryptExApi.Models.ViewModel.Admin;
using CryptExApi.Models.ViewModel.Payment;
using Microsoft.EntityFrameworkCore;

namespace CryptExApi.Repositories
{
    public interface IAdminRepository
    {
        Task<List<UserViewModel>> SearchUser(string query);

        Task<StatsViewModel> GetStats();

        Task<List<FullDepositViewModel>> GetAllDeposits(Guid? userId, PaymentStatus? status = null, WalletType type = WalletType.Fiat);

        Task<List<FullBankAccountViewModel>> GetPendingBankAccounts();

        Task SetBankAccountStatus(Guid id, BankAccountStatus status);

        Task SetCryptoDepositStatus(Guid sessionId, PaymentStatus status);

        Task SetDepositAmount(Guid id, decimal amount);
        Task<List<FullDepositViewModel>> GetPendingCryptoDeposits();
        Task VerifyCryptoDeposit(VerifyCryptoDepositDto dto);
        Task SetWalletAddress(Guid walletId, string address);
    }
    public class AdminRepository : IAdminRepository
    {
        private readonly CryptExDbContext dbContext;

        public AdminRepository(CryptExDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        public async Task<List<FullDepositViewModel>> GetPendingCryptoDeposits()
        {
            var deposits = await dbContext.CryptoDeposits
                .Include(x => x.User)
                .Include(x => x.Wallet)
                .Where(x => x.Status == PaymentStatus.AwaitingVerification)
                .ToListAsync();

            return deposits.Select(x => FullDepositViewModel.FromDeposit(x)).ToList();
        }

        public async Task VerifyCryptoDeposit(VerifyCryptoDepositDto dto)
        {
            var deposit = await dbContext.CryptoDeposits
                .Include(x => x.User)
                .SingleOrDefaultAsync(x => x.Id == dto.DepositId);

            if (deposit == null)
                throw new NotFoundException("Deposit not found.");

            if (deposit.Status != PaymentStatus.AwaitingVerification)
                throw new BadRequestException("This deposit is not awaiting verification.");

            deposit.Status = dto.IsVerified ? PaymentStatus.Success : PaymentStatus.Failed;
            deposit.Amount = dto.FinalAmount; // Admin can adjust the final amount

            await dbContext.SaveChangesAsync();
        }

        public async Task<List<UserViewModel>> SearchUser(string query)
        {
            var users = (await dbContext.Users
                .Include(x => x.Address)
                    .ThenInclude(x => x.Country)
                .ToListAsync())
                .Where(x =>
                {
                    var match = false;
                    match = x.FirstName.Contains(query);
                    match = x.LastName.Contains(query);
                    match = x.Email.Contains(query);
                    if (x.Address != null)
                        match = x.Address.ToString().Contains(query);

                    return match;
                })
                .Take(25)
                .Select(x => UserViewModel.FromAppUser(x));

            return users.ToList();
        }

        public async Task<StatsViewModel> GetStats()
        {
            //This method is quite resource intensive, in a real world application we would use tools like caching to reduce the performance impact.
            var result = new StatsViewModel();

            result.TotalUsers = await GetTotalUsers();
            result.TotalTradedAmount = await GetTotalTraded();

            result.NewUsers24h = await GetTotalUsers(x => x > DateTime.UtcNow.AddHours(-24));
            result.NewUsers7d = await GetTotalUsers(x => x > DateTime.UtcNow.AddDays(-7));
            result.NewUsers30d = await GetTotalUsers(x => x > DateTime.UtcNow.AddDays(-30));

            result.TradedAmount24h = await GetTotalTraded(x => x > DateTime.UtcNow.AddHours(-24));
            result.TradedAmount7d = await GetTotalTraded(x => x > DateTime.UtcNow.AddDays(-7));
            result.TradedAmount30d = await GetTotalTraded(x => x > DateTime.UtcNow.AddDays(-30));

            return result;
        }

        private async Task<long> GetTotalUsers(Func<DateTime, bool> time = null)
        {
            return (await dbContext.Users
                .ToListAsync())
                .Where(x => time == null || time(x.CreationDate)).LongCount();
        }

        private async Task<decimal> GetTotalTraded(Func<DateTime, bool> time = null)
        {
            decimal total = 0;

            foreach (var deposit in (await dbContext.FiatDeposits.ToListAsync()).Where(x => time == null || time(x.CreationDate)).ToList())
                total += deposit.Amount;
            foreach (var deposit in (await dbContext.CryptoDeposits.ToListAsync()).Where(x => time == null || time(x.CreationDate)).ToList())
                total += deposit.Amount;
            foreach (var withdraw in (await dbContext.FiatWithdrawals.ToListAsync()).Where(x => time == null || time(x.CreationDate)))
                total += withdraw.Amount;

            return total;
        }

        public async Task<List<FullDepositViewModel>> GetAllDeposits(Guid? userId, PaymentStatus? status = null, WalletType type = WalletType.Fiat)
        {
            var fiatDeposits = new List<FiatDeposit>();

            if (type == WalletType.Fiat)
            {
                fiatDeposits = dbContext.FiatDeposits
                    .Include(x => x.Wallet)
                    .Include(x => x.User)
                    .Where(x => !userId.HasValue || x.UserId == userId.Value)
                    .Where(x => !status.HasValue || x.Status == status.Value)
                    .ToList();
            }

            var cryptoDeposits = new List<CryptoDeposit>();

            if (type == WalletType.Crypto)
            {
                cryptoDeposits = dbContext.CryptoDeposits
                    .Include(x => x.Wallet)
                    .Include(x => x.User)
                    .Where(x => !userId.HasValue || x.UserId == userId.Value)
                    .Where(x => !status.HasValue || x.Status == status.Value)
                    .ToList();
            }

            var result = new List<FullDepositViewModel>(fiatDeposits.Count + cryptoDeposits.Count);
            result.AddRange(fiatDeposits.Select(x => FullDepositViewModel.FromDeposit(x)));
            result.AddRange(cryptoDeposits.Select(x => FullDepositViewModel.FromDeposit(x)));

            return result;
        }

        public async Task<List<FullBankAccountViewModel>> GetPendingBankAccounts()
        {
            var bankAccounts = dbContext.BankAccounts
                .Include(x => x.User)
                .Where(x => x.Status == BankAccountStatus.NotProcessed).ToList();

            return bankAccounts.Select(x => FullBankAccountViewModel.FromBankAccount(x)).ToList();
        }

        public async Task SetBankAccountStatus(Guid id, BankAccountStatus status)
        {
            var account = await dbContext.BankAccounts.SingleOrDefaultAsync(x => x.Id == id);

            if (account == null)
                throw new NotFoundException("Bank account not found.");

            account.Status = status;
            account.DecisionDate = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();
        }

        public async Task SetCryptoDepositStatus(Guid sessionId, PaymentStatus status)
        {
            var deposit = await dbContext.CryptoDeposits.SingleOrDefaultAsync(x => x.Id == sessionId);
            deposit.Status = status;

            await dbContext.SaveChangesAsync();
        }

        public async Task SetDepositAmount(Guid id, decimal amount)
        {
            var fiatDeposit = await dbContext.FiatDeposits.SingleOrDefaultAsync(x => x.Id == id);
            var cryptoDeposit = await dbContext.CryptoDeposits.SingleOrDefaultAsync(x => x.Id == id);

            if (fiatDeposit != null)
                fiatDeposit.Amount = amount;
            if (cryptoDeposit != null)
                cryptoDeposit.Amount = amount;
            if (fiatDeposit == null && cryptoDeposit == null)
                throw new NotFoundException("No deposit with the specified id found.");

            await dbContext.SaveChangesAsync();
        }

        // Модифицированный метод для поддержки установки адресов как для крипто, так и для фиатных кошельков
        public async Task SetWalletAddress(Guid walletId, string address)
        {
            var wallet = await dbContext.Wallets.SingleOrDefaultAsync(w => w.Id == walletId);

            if (wallet == null)
                throw new NotFoundException("Wallet not found.");

            // Удалена проверка на тип кошелька, чтобы поддерживать как крипто, так и фиатные кошельки
            // if (wallet.Type != WalletType.Crypto)
            //     throw new BadRequestException("Only crypto wallets can have addresses configured.");

            wallet.AdminWalletAddress = address;
            wallet.IsAddressConfigured = true;

            await dbContext.SaveChangesAsync();
        }
    }
}
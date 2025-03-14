using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CryptExApi.Data;
using CryptExApi.Exceptions;
using CryptExApi.Models;
using CryptExApi.Models.Database;
using CryptExApi.Models.DTO;
using CryptExApi.Models.ViewModel.Payment;
using CryptExApi.Utilities;
using Microsoft.EntityFrameworkCore;

namespace CryptExApi.Repositories
{
    public interface IDepositRepository
    {
        Task<List<DepositViewModel>> GetDeposits(AppUser user);

        Task<List<DepositViewModel>> GetDeposits(Guid userId);

        Task<CryptoDepositViewModel> DepositCrypto(AppUser user, Guid walletId);
        Task NotifyCryptoPayment(AppUser user, CryptoPaymentNotificationDto dto);
        Task CreateManualDeposit(AppUser user, Wallet wallet, CryptoPaymentNotificationDto dto);
    }

    public class DepositRepository : IDepositRepository
    {
        private readonly CryptExDbContext dbContext;

        public DepositRepository(CryptExDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        public async Task<List<DepositViewModel>> GetDeposits(AppUser user)
        {
            return await GetDeposits(user.Id);
        }

        // Existing constructor and methods

        public async Task NotifyCryptoPayment(AppUser user, CryptoPaymentNotificationDto dto)
        {
            if (user == null)
                throw new ArgumentNullException(nameof(user));

            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            // Get the deposit record from the database
            var deposit = await dbContext.CryptoDeposits
                .Include(x => x.Wallet)
                .SingleOrDefaultAsync(x => x.Id == dto.DepositId && x.UserId == user.Id);

            if (deposit == null)
                throw new NotFoundException("Deposit not found.");

            if (deposit.Status != PaymentStatus.NotProcessed)
                throw new BadRequestException("This deposit is already being processed.");

            // Update the deposit with user-provided information
            deposit.Status = PaymentStatus.AwaitingVerification;
            deposit.Amount = dto.AmountSent;
            deposit.TransactionId = dto.TransactionHash; // Using existing field for transaction hash

            // If you want to store both hash and sender address in the existing field
            if (!string.IsNullOrEmpty(dto.SenderWalletAddress))
            {
                deposit.TransactionId = $"Hash: {dto.TransactionHash}, From: {dto.SenderWalletAddress}";
            }

            await dbContext.SaveChangesAsync();
        }
        public async Task<List<DepositViewModel>> GetDeposits(Guid userId)
        {
            var fiatDeposits = dbContext.FiatDeposits
                .Include(x => x.Wallet)
                .Where(x => x.UserId == userId)
                .ToList();

            var cryptoDeposits = dbContext.CryptoDeposits
                .Include(x => x.Wallet)
                .Where(x => x.UserId == userId)
                .ToList();

            var result = new List<DepositViewModel>(fiatDeposits.Count + cryptoDeposits.Count);
            result.AddRange(fiatDeposits.Select(x => FiatDepositViewModel.FromFiatDeposit(x)));
            result.AddRange(cryptoDeposits.Select(x => CryptoDepositViewModel.FromCryptoDeposit(x)));

            return result;
        }

        public async Task<CryptoDepositViewModel> DepositCrypto(AppUser user, Guid walletId)
        {
            var wallet = await dbContext.Wallets.SingleOrDefaultAsync(x => x.Id == walletId);

            if (wallet == null || wallet.Type != WalletType.Crypto)
                throw new BadRequestException("Invalid wallet Id provided.");

            if (!wallet.IsAddressConfigured)
                throw new BadRequestException("This cryptocurrency doesn't have a configured wallet address yet. Please contact admin.");

            var deposit = await dbContext.CryptoDeposits.AddAsync(new CryptoDeposit
            {
                Amount = 0,
                Status = Models.PaymentStatus.NotProcessed,
                CreationDate = DateTime.UtcNow,
                TransactionId = StringUtilities.SecureRandom(32, StringUtilities.AllowedChars.AlphabetNumbers),
                WalletId = walletId,
                Wallet = wallet,
                UserId = user.Id,
                User = user
            });

            await dbContext.SaveChangesAsync();

            var result = CryptoDepositViewModel.FromCryptoDeposit(deposit.Entity);
            result.WalletAddress = wallet.AdminWalletAddress;

            return result;
        }

        public async Task CreateManualDeposit(AppUser user, Wallet wallet, CryptoPaymentNotificationDto dto)
        {
            var deposit = new CryptoDeposit
            {
                Amount = dto.AmountSent,
                Status = Models.PaymentStatus.AwaitingVerification,
                CreationDate = DateTime.UtcNow,
                TransactionHash = dto.TransactionHash,
                SenderWalletAddress = dto.SenderWalletAddress,
                WalletId = wallet.Id,
                Wallet = wallet,
                UserId = user.Id,
                User = user,
                AdminNotes = dto.Email
            };

            await dbContext.CryptoDeposits.AddAsync(deposit);
            await dbContext.SaveChangesAsync();
        }
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CryptExApi.Data;
using CryptExApi.Exceptions;
using CryptExApi.Models;
using CryptExApi.Models.Database;
using CryptExApi.Models.DTO;
using Microsoft.EntityFrameworkCore;

namespace CryptExApi.Repositories
{
    public interface IAnonymousExchangeRepository
    {
        Task<AnonymousExchange> CreateExchangeRequest(AnonymousExchangeRequestDto dto, decimal exchangeRate, decimal destinationAmount);
        Task<AnonymousExchange> GetExchangeById(Guid id);
        Task<List<AnonymousExchange>> GetPendingExchanges();
        Task UpdateExchangeStatus(Guid id, PaymentStatus status, string adminNotes = null);
        Task ConfirmExchangeTransaction(Guid id, string transactionHash, string senderAddress);
    }

    public class AnonymousExchangeRepository : IAnonymousExchangeRepository
    {
        private readonly CryptExDbContext dbContext;

        public AnonymousExchangeRepository(CryptExDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        public async Task<AnonymousExchange> CreateExchangeRequest(AnonymousExchangeRequestDto dto, decimal exchangeRate, decimal destinationAmount)
        {
            var sourceWallet = await dbContext.Wallets.FindAsync(dto.SourceWalletId);
            var destinationWallet = await dbContext.Wallets.FindAsync(dto.DestinationWalletId);

            if (sourceWallet == null || destinationWallet == null)
                throw new NotFoundException("One or both wallets could not be found");

            if (!sourceWallet.IsAddressConfigured)
                throw new BadRequestException($"Admin wallet for {sourceWallet.Ticker} is not configured yet");

            var exchange = new AnonymousExchange
            {
                UserEmail = dto.UserEmail,
                DestinationWalletAddress = dto.DestinationWalletAddress,
                SourceAmount = dto.Amount,
                DestinationAmount = destinationAmount,
                ExchangeRate = exchangeRate,
                SourceWalletId = dto.SourceWalletId,
                SourceWallet = sourceWallet,
                DestinationWalletId = dto.DestinationWalletId,
                DestinationWallet = destinationWallet,
                Status = PaymentStatus.AwaitingVerification,
                CreationDate = DateTime.UtcNow
            };

            await dbContext.AnonymousExchanges.AddAsync(exchange);
            await dbContext.SaveChangesAsync();

            return exchange;
        }

        public async Task<AnonymousExchange> GetExchangeById(Guid id)
        {
            var exchange = await dbContext.AnonymousExchanges
                .Include(x => x.SourceWallet)
                .Include(x => x.DestinationWallet)
                .SingleOrDefaultAsync(x => x.Id == id);

            if (exchange == null)
                throw new NotFoundException("Exchange request not found");

            return exchange;
        }

        public async Task<List<AnonymousExchange>> GetPendingExchanges()
        {
            return await dbContext.AnonymousExchanges
                .Include(x => x.SourceWallet)
                .Include(x => x.DestinationWallet)
                .Where(x => x.Status == PaymentStatus.AwaitingVerification || x.Status == PaymentStatus.Pending)
                .OrderByDescending(x => x.CreationDate)
                .ToListAsync();
        }

        public async Task UpdateExchangeStatus(Guid id, PaymentStatus status, string adminNotes = null)
        {
            var exchange = await dbContext.AnonymousExchanges.FindAsync(id);

            if (exchange == null)
                throw new NotFoundException("Exchange request not found");

            exchange.Status = status;

            if (status == PaymentStatus.Success)
                exchange.CompletionDate = DateTime.UtcNow;

            if (!string.IsNullOrEmpty(adminNotes))
                exchange.AdminNotes = adminNotes;

            await dbContext.SaveChangesAsync();
        }

        public async Task ConfirmExchangeTransaction(Guid id, string transactionHash, string senderAddress)
        {
            var exchange = await dbContext.AnonymousExchanges.FindAsync(id);

            if (exchange == null)
                throw new NotFoundException("Exchange request not found");

            if (exchange.Status != PaymentStatus.AwaitingVerification)
                throw new BadRequestException("This exchange is already being processed");

            exchange.TransactionHash = transactionHash;
            exchange.SenderWalletAddress = senderAddress;
            exchange.Status = PaymentStatus.Pending;

            await dbContext.SaveChangesAsync();
        }
    }
}
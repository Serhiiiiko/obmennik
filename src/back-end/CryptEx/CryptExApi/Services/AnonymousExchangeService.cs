using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CryptExApi.Exceptions;
using CryptExApi.Models;
using CryptExApi.Models.Database;
using CryptExApi.Models.DTO;
using CryptExApi.Models.SignalR;
using CryptExApi.Repositories;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CryptExApi.Services
{
    public interface IAnonymousExchangeService
    {
        Task<AnonymousExchangeResponseDto> CreateExchangeRequest(AnonymousExchangeRequestDto dto);
        Task<AnonymousExchangeResponseDto> GetExchangeById(Guid id);
        Task<List<AnonymousExchange>> GetPendingExchanges();
        Task<List<AnonymousExchange>> GetAllExchanges(PaymentStatus? status = null);
        Task UpdateExchangeStatus(Guid id, PaymentStatus status, string adminNotes = null);
        Task ConfirmExchangeTransaction(AnonymousExchangeConfirmationDto dto);

    }

    public class AnonymousExchangeService : IAnonymousExchangeService
    {
        private readonly IAnonymousExchangeRepository anonymousExchangeRepository;
        private readonly IWalletRepository walletRepository;
        private readonly IHubContext<AnonymousExchangeHub> hubContext;
        private readonly ILogger<AnonymousExchangeService> logger;

        public AnonymousExchangeService(
            IAnonymousExchangeRepository anonymousExchangeRepository,
            IWalletRepository walletRepository,
            IHubContext<AnonymousExchangeHub> hubContext,
            ILogger<AnonymousExchangeService> logger) 
        {
            this.anonymousExchangeRepository = anonymousExchangeRepository;
            this.walletRepository = walletRepository;
            this.hubContext = hubContext;
            this.logger = logger;
        }

        public async Task<AnonymousExchangeResponseDto> CreateExchangeRequest(AnonymousExchangeRequestDto dto)
        {
            if (string.IsNullOrEmpty(dto.UserEmail))
                throw new BadRequestException("Email is required");

            if (string.IsNullOrEmpty(dto.DestinationWalletAddress))
                throw new BadRequestException("Destination wallet address is required");

            var sourceWallet = await walletRepository.GetWalletById(dto.SourceWalletId);
            var destinationWallet = await walletRepository.GetWalletById(dto.DestinationWalletId);

            if (sourceWallet == null || destinationWallet == null)
                throw new NotFoundException("One or both wallets could not be found");

            // Get current exchange rate
            decimal exchangeRate;

            if (sourceWallet.Type == WalletType.Crypto && destinationWallet.Type == WalletType.Crypto)
                exchangeRate = await walletRepository.GetCryptoExchangeRate(sourceWallet.Ticker, destinationWallet.Ticker);
            else if (sourceWallet.Type == WalletType.Fiat && destinationWallet.Type == WalletType.Fiat)
                exchangeRate = await walletRepository.GetFiatExchangeRate(sourceWallet.Ticker, destinationWallet.Ticker);
            else
                exchangeRate = await walletRepository.GetCryptoExchangeRate(sourceWallet.Ticker, destinationWallet.Ticker);

            // Calculate destination amount
            decimal destinationAmount = dto.Amount * exchangeRate;

            // Create exchange request
            var exchange = await anonymousExchangeRepository.CreateExchangeRequest(dto, exchangeRate, destinationAmount);

            // Return response
            return new AnonymousExchangeResponseDto
            {
                Id = exchange.Id,
                SourceWalletTicker = sourceWallet.Ticker,
                DestinationWalletTicker = destinationWallet.Ticker,
                SourceAmount = exchange.SourceAmount,
                DestinationAmount = exchange.DestinationAmount,
                ExchangeRate = exchange.ExchangeRate,
                AdminWalletAddress = sourceWallet.AdminWalletAddress,
                Status = exchange.Status
            };
        }

        public async Task<AnonymousExchangeResponseDto> GetExchangeById(Guid id)
        {
            var exchange = await anonymousExchangeRepository.GetExchangeById(id);

            return new AnonymousExchangeResponseDto
            {
                Id = exchange.Id,
                SourceWalletTicker = exchange.SourceWallet.Ticker,
                DestinationWalletTicker = exchange.DestinationWallet.Ticker,
                SourceAmount = exchange.SourceAmount,
                DestinationAmount = exchange.DestinationAmount,
                ExchangeRate = exchange.ExchangeRate,
                AdminWalletAddress = exchange.SourceWallet.AdminWalletAddress,
                Status = exchange.Status
            };
        }

        public async Task<List<AnonymousExchange>> GetPendingExchanges()
        {
            return await anonymousExchangeRepository.GetPendingExchanges();
        }
        public async Task<List<AnonymousExchange>> GetAllExchanges(PaymentStatus? status = null)
        {
            return await anonymousExchangeRepository.GetAllExchanges(status);
        }
        public async Task UpdateExchangeStatus(Guid id, PaymentStatus status, string adminNotes = null)
        {
            var exchange = await anonymousExchangeRepository.GetExchangeById(id);
            if (exchange == null)
                throw new NotFoundException("Exchange not found");

            logger.LogInformation($"Updating exchange {id} status to {status} for user {exchange.UserEmail}");

            // Сначала обновляем в базе данных
            await anonymousExchangeRepository.UpdateExchangeStatus(id, status, adminNotes);

            try
            {
                // Отправляем уведомление пользователю
                var notification = new
                {
                    id = id.ToString(),  // Важно: убедитесь, что ключ совпадает с тем, что ожидает клиент
                    status = (int)status,
                    adminNotes = adminNotes ?? ""
                };

                logger.LogInformation($"Sending SignalR notification: {System.Text.Json.JsonSerializer.Serialize(notification)}");

                // Отправляем всем клиентам (лучше, чем только одному, для тестирования)
                await hubContext.Clients.All.SendAsync(AnonymousExchangeHub.Name, notification);

                // Также можно попробовать отправить конкретному пользователю
                // await hubContext.Clients.User(exchange.UserEmail).SendAsync(AnonymousExchangeHub.Name, notification);

                logger.LogInformation($"SignalR notification sent successfully");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, $"Error sending SignalR notification for exchange {id}");
            }
        }

        public async Task ConfirmExchangeTransaction(AnonymousExchangeConfirmationDto dto)
        {
            if (string.IsNullOrEmpty(dto.TransactionHash))
                throw new BadRequestException("Transaction hash is required");

            if (string.IsNullOrEmpty(dto.SenderWalletAddress))
                throw new BadRequestException("Sender wallet address is required");

            await anonymousExchangeRepository.ConfirmExchangeTransaction(
                dto.ExchangeId,
                dto.TransactionHash,
                dto.SenderWalletAddress);
        }
    }
}
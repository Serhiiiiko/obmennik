using CryptExApi.Repositories;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System.Threading;
using System;
using Microsoft.Extensions.DependencyInjection;

namespace CryptExApi.Services
{
    public class CryptoPriceUpdateService : BackgroundService
    {
        private readonly ILogger<CryptoPriceUpdateService> _logger;
        private readonly IServiceProvider _services;
        private readonly TimeSpan _updateInterval = TimeSpan.FromSeconds(15);

        public CryptoPriceUpdateService(
            ILogger<CryptoPriceUpdateService> logger,
            IServiceProvider services)
        {
            _logger = logger;
            _services = services;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Crypto Price Update Service is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogInformation("Updating cryptocurrency prices...");

                try
                {
                    using (var scope = _services.CreateScope())
                    {
                        var walletRepository = scope.ServiceProvider.GetRequiredService<IWalletRepository>();
                        var wallets = await walletRepository.GetCryptoWallets();
                        var defaultCurrency = "USD";

                        foreach (var wallet in wallets)
                        {
                            try
                            {
                                // Force update price by passing noCache=true
                                await walletRepository.GetCryptoExchangeRate(
                                    wallet.Ticker,
                                    defaultCurrency,
                                    null,
                                    true);

                                _logger.LogTrace($"Updated price for {wallet.Ticker}");
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, $"Error updating price for {wallet.Ticker}");
                            }

                            // Small delay between API calls to avoid rate limiting
                            await Task.Delay(500, stoppingToken);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred during cryptocurrency price update");
                }

                await Task.Delay(_updateInterval, stoppingToken);
            }

            _logger.LogInformation("Crypto Price Update Service is stopping.");
        }
    }
}

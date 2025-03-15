using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CryptExApi.Models;
using CryptExApi.Models.Database;
using CryptExApi.Models.DTO;
using CryptExApi.Models.ViewModel;
using CryptExApi.Repositories;
using CryptExApi.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CryptExApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PublicExchangeController : ControllerBase
    {
        private readonly ILogger<PublicExchangeController> logger;
        private readonly IExceptionHandlerService exceptionHandler;
        private readonly IWalletService walletService;
        private readonly IAnonymousExchangeService anonymousExchangeService;

        public PublicExchangeController(
            ILogger<PublicExchangeController> logger,
            IExceptionHandlerService exceptionHandler,
            IWalletService walletService,
            IAnonymousExchangeService anonymousExchangeService)
        {
            this.logger = logger;
            this.exceptionHandler = exceptionHandler;
            this.walletService = walletService;
            this.anonymousExchangeService = anonymousExchangeService;
        }

        [HttpGet("wallets")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(List<WalletViewModel>))]
        public async Task<IActionResult> GetWallets([FromQuery] string currency = "USD")
        {
            try
            {
                var result = new List<WalletViewModel>();
                result.AddRange(await walletService.GetFiatWallets());
                result.AddRange(await walletService.GetCryptoWallets(currency));
                return Ok(result);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Could not get wallets.");
                return exceptionHandler.Handle(ex, Request);
            }
        }

        [HttpGet("exchangeRate")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(decimal))]
        public async Task<IActionResult> GetExchangeRate(
      [FromQuery] Guid sourceWalletId,
      [FromQuery] Guid destinationWalletId)
        {
            try
            {
                // Get wallet information
                var sourceWallet = await walletService.GetWalletById(sourceWalletId);
                var destinationWallet = await walletService.GetWalletById(destinationWalletId);

                // Get exchange rate
                decimal rate;

                if (sourceWallet.Type == WalletType.Crypto && destinationWallet.Type == WalletType.Crypto)
                {
                    // For crypto-to-crypto, we need to get the exchange rate from the rate service
                    var cryptoInfo = await walletService.GetCryptoFull(sourceWalletId, destinationWallet.Ticker);
                    rate = cryptoInfo.SelectedCurrencyPair?.Rate ?? 1.0m;
                }
                else if (sourceWallet.Type == WalletType.Fiat && destinationWallet.Type == WalletType.Fiat)
                {
                    // For fiat-to-fiat, we need to use the fiat exchange rate service
                    // Access this through the repository directly or add a method to the service
                    // For now, we'll use a simplified approach
                    var walletRepository = HttpContext.RequestServices.GetService(typeof(IWalletRepository)) as IWalletRepository;
                    rate = await walletRepository.GetFiatExchangeRate(sourceWallet.Ticker, destinationWallet.Ticker);
                }
                else
                {
                    // For crypto-to-fiat or fiat-to-crypto
                    var walletToLookup = sourceWallet.Type == WalletType.Crypto ? sourceWalletId : destinationWalletId;
                    var currencyTicker = sourceWallet.Type == WalletType.Fiat ? sourceWallet.Ticker : destinationWallet.Ticker;

                    var cryptoInfo = await walletService.GetCryptoFull(walletToLookup, currencyTicker);
                    rate = cryptoInfo.SelectedCurrencyPair?.Rate ?? 1.0m;

                    // If we're going from fiat to crypto, we need to invert the rate
                    if (sourceWallet.Type == WalletType.Fiat)
                    {
                        rate = 1.0m / rate;
                    }
                }

                return Ok(rate);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Could not get exchange rate.");
                return exceptionHandler.Handle(ex, Request);
            }
        }

        [HttpPost("createExchange")]
        [ProducesResponseType(StatusCodes.Status201Created, Type = typeof(AnonymousExchangeResponseDto))]
        public async Task<IActionResult> CreateExchange([FromBody] AnonymousExchangeRequestDto dto)
        {
            try
            {
                var result = await anonymousExchangeService.CreateExchangeRequest(dto);
                return Created($"/api/PublicExchange/exchange/{result.Id}", result);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Could not create exchange request.");
                return exceptionHandler.Handle(ex, Request);
            }
        }

        [HttpGet("exchange/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(AnonymousExchangeResponseDto))]
        public async Task<IActionResult> GetExchange(Guid id)
        {
            try
            {
                var result = await anonymousExchangeService.GetExchangeById(id);
                return Ok(result);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Could not get exchange request.");
                return exceptionHandler.Handle(ex, Request);
            }
        }

        [HttpPost("confirmTransaction")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> ConfirmTransaction([FromBody] AnonymousExchangeConfirmationDto dto)
        {
            try
            {
                await anonymousExchangeService.ConfirmExchangeTransaction(dto);
                return Ok();
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Could not confirm transaction.");
                return exceptionHandler.Handle(ex, Request);
            }
        }
    }
}
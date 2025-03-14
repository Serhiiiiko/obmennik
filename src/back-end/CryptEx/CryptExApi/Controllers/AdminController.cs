﻿using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CryptExApi.Models;
using CryptExApi.Models.Database;
using CryptExApi.Models.ViewModel;
using CryptExApi.Models.ViewModel.Admin;
using CryptExApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CryptExApi.Controllers
{
    [Route("api/[controller]")]
    [Authorize(Roles = "admin")]
    [ApiController]
    public class AdminController : ControllerBase
    {
        private readonly ILogger<AdminController> logger;
        private readonly IExceptionHandlerService exHandler;
        private readonly IAdminService adminService;
        private readonly IUserService userService;
        private readonly IAssetConvertService assetConvertService;

        public AdminController(
            ILogger<AdminController> logger,
            IExceptionHandlerService exHandler,
            IAdminService adminService,
            IUserService userService,
            IAssetConvertService assetConvertService)
        {
            this.logger = logger;
            this.exHandler = exHandler;
            this.adminService = adminService;
            this.userService = userService;
            this.assetConvertService = assetConvertService;
        }

        [HttpGet("user")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(FullUserViewModel))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetFullUser([FromQuery] Guid userId)
        {
            try {
                var user = await userService.GetFullUser(userId);

                return Ok(user);
            } catch (Exception ex) {
                logger.LogWarning(ex, "Couldn't get user.");
                return exHandler.Handle(ex, Request);
            }
        }

        [HttpGet("searchUser")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(List<UserViewModel>))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> SearchUser([FromQuery] string query)
        {
            try {
                var users = await adminService.SearchUser(query);

                return Ok(users);
            } catch (Exception ex) {
                logger.LogWarning(ex, "Couldn't search user.");
                return exHandler.Handle(ex, Request);
            }
        }

        [HttpGet("stats")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(StatsViewModel))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetStats()
        {
            try {
                var stats = await adminService.GetStats();

                return Ok(stats);
            } catch (Exception ex) {
                logger.LogWarning(ex, "Couldn't get stats");
                return exHandler.Handle(ex, Request);
            }
        }

        [HttpGet("deposits")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(List<FullDepositViewModel>))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetAllDeposits([FromQuery] Guid? userId, [FromQuery] PaymentStatus? status, [FromQuery] WalletType? type)
        {
            try {
                var deposits = await adminService.GetAllDeposits(userId, status, type.GetValueOrDefault(WalletType.Fiat));

                return Ok(deposits);
            } catch (Exception ex) {
                logger.LogWarning(ex, "Couldn't get all deposits.");
                return exHandler.Handle(ex, Request);
            }
        }

        [HttpPost("setPaymentStatus")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> SetPaymentStatus([FromQuery] string sessionId, [FromQuery] PaymentStatus status)
        {
            try {
                await adminService.SetPaymentStatus(sessionId, status);

                return Ok();
            } catch (Exception ex) {
                logger.LogWarning(ex, "Couldn't set payment status");
                return exHandler.Handle(ex, Request);
            }
        }

        [HttpPost("setPaymentAmount")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> SetPaymentAmount([FromQuery] Guid id, [FromQuery] decimal amount)
        {
            try {
                await adminService.SetPaymentAmount(id, amount);

                return Ok();
            } catch (Exception ex) {
                logger.LogWarning(ex, "Couldn't set payment amount");
                return exHandler.Handle(ex, Request);
            }
        }

        [HttpPost("setCryptoDepositStatus")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> SetCryptoDepositStatus([FromQuery] Guid id, [FromQuery] PaymentStatus status)
        {
            try {
                await adminService.SetPaymentStatus(id, status);

                return Ok();
            } catch (Exception ex) {
                logger.LogWarning(ex, "Couldn't set payment status");
                return exHandler.Handle(ex, Request);
            }
        }

        [HttpGet("pendingBankAccounts")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(List<FullBankAccountViewModel>))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetPendingBankAccounts()
        {
            try {
                var result = await adminService.GetPendingBankAccounts();

                return Ok(result);
            } catch (Exception ex) {
                logger.LogWarning(ex, "Couldn't get pending bank accounts.");
                return exHandler.Handle(ex, Request);
            }
        }

        [HttpPost("setBankAccountStatus")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> SetBankAccountStatus([FromQuery] Guid bankAccountId, [FromQuery] BankAccountStatus status)
        {
            try {
                await adminService.SetBankAccountStatus(bankAccountId, status);

                return Ok();
            } catch (Exception ex) {
                logger.LogWarning(ex, "Couldn't set bank account status");
                return exHandler.Handle(ex, Request);
            }
        }

        // Добавьте этот метод в AdminController.cs или обновите существующий
        [HttpPost("setWalletAddress")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> SetWalletAddress([FromQuery] Guid walletId, [FromQuery] string address)
        {
            try
            {
                await adminService.SetWalletAddress(walletId, address);
                return Ok();
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Couldn't set wallet address");
                return exHandler.Handle(ex, Request);
            }
        }

        [HttpPost("setAccountStatus")]
        public async Task<IActionResult> SetAccountStatus([FromQuery] Guid userId, [FromQuery] AccountStatus status)
        {
            try {
                await userService.SetAccountStatus(userId, status);
                
                return Ok();
            } catch (Exception ex) {
                logger.LogWarning(ex, "Could not set accoutn status");
                return exHandler.Handle(ex, Request);
            }
        }
    }
}

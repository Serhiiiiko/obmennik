using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using CryptExApi.Data;
using CryptExApi.Exceptions;
using CryptExApi.Models.Database;
using CryptExApi.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CryptExApi.Utilities
{
    /// <summary>
    /// Default data required to be seeded in every context of the application.
    /// </summary>
    public static class DefaultDataSeeder
    {
        public static readonly List<(string leftTicker, string rightTicker, decimal exchangeRate)> FiatExchangeRates = new()
        {
            //As of 15.03.2025
            ("USD", "USD", 1m),
            ("USD", "CHF", 0.87m),
            ("USD", "EUR", 0.92m),
            ("USD", "GBP", 0.77m),
            ("USD", "CAD", 1.34m),
            ("USD", "AUD", 1.49m),
            ("USD", "JPY", 147.50m),

            ("CHF", "CHF", 1m),
            ("CHF", "USD", 1.15m),
            ("CHF", "EUR", 1.06m),
            ("CHF", "GBP", 0.89m),
            ("CHF", "CAD", 1.54m),
            ("CHF", "AUD", 1.71m),
            ("CHF", "JPY", 169.65m),

            ("EUR", "EUR", 1m),
            ("EUR", "USD", 1.09m),
            ("EUR", "CHF", 0.94m),
            ("EUR", "GBP", 0.84m),
            ("EUR", "CAD", 1.46m),
            ("EUR", "AUD", 1.62m),
            ("EUR", "JPY", 160.87m),

            ("GBP", "GBP", 1m),
            ("GBP", "USD", 1.30m),
            ("GBP", "CHF", 1.13m),
            ("GBP", "EUR", 1.19m),
            ("GBP", "CAD", 1.74m),
            ("GBP", "AUD", 1.94m),
            ("GBP", "JPY", 191.74m),

            ("CAD", "CAD", 1m),
            ("CAD", "USD", 0.75m),
            ("CAD", "CHF", 0.65m),
            ("CAD", "EUR", 0.69m),
            ("CAD", "GBP", 0.58m),
            ("CAD", "AUD", 1.11m),
            ("CAD", "JPY", 110.59m),

            ("AUD", "AUD", 1m),
            ("AUD", "USD", 0.67m),
            ("AUD", "CHF", 0.58m),
            ("AUD", "EUR", 0.62m),
            ("AUD", "GBP", 0.52m),
            ("AUD", "CAD", 0.90m),
            ("AUD", "JPY", 99.13m),

            ("JPY", "JPY", 1m),
            ("JPY", "USD", 0.0068m),
            ("JPY", "CHF", 0.0059m),
            ("JPY", "EUR", 0.0062m),
            ("JPY", "GBP", 0.0052m),
            ("JPY", "CAD", 0.0090m),
            ("JPY", "AUD", 0.0101m),
        };

        public static readonly List<(string ticker, string fullName)> Fiats = new()
        {
            ("USD", "US Dollar"),
            ("CHF", "Swiss Franc"),
            ("EUR", "Euro"),
            ("GBP", "British Pound"),
            ("CAD", "Canadian Dollar"),
            ("AUD", "Australian Dollar"),
            ("JPY", "Japan Yen")
        };

        public static readonly List<(string ticker, string fullName)> Cryptos = new()
        {
            ("BTC", "Bitcoin"),
            ("ETH", "Ethereum"),
            ("ADA", "Cardano"),
            ("XRP", "Ripple"),
            ("BNB", "Binance Coin"),
            ("USDT", "Tether"),
            ("USDT-BEP20", "Tether BEP 20"),
            ("ATOM", "Cosmos"),
            ("ZEC", "Zcash"),
            ("TON", "Toncoin"),
            ("UST-TRC20", "Terra USD TRC 20"),
            ("LTC", "Litecoin")
        };



        public static readonly Dictionary<string, decimal> CryptoUsdExchangeRates = new()
        {
            // These are fallback rates in case the Coinbase API fails
            // Values represent approximate USD price per unit as of March 2025
            // Standard coins likely available in Coinbase API
            {"BTC", 61250.00m},
            {"ETH", 3350.00m},
            {"LTC", 85.50m},
            {"XRP", 0.55m},
            {"ADA", 0.45m},
            {"ATOM", 9.25m},
            {"ZEC", 28.75m},
            
            // Coins that might not be available in Coinbase API
            {"BNB", 580.00m},
            {"TON", 5.95m},
            {"USDT", 1.00m},
            {"USDT-BEP20", 1.00m},
            {"UST-TRC20", 1.00m},
        };

        private static readonly List<string> Countries = new()
        {
            "AF",
            "AL",
            "DZ",
            "AS",
            "AD",
            "AO",
            "AI",
            "AQ",
            "AG",
            "AR",
            "AM",
            "AW",
            "AU",
            "AT",
            "AZ",
            "BS",
            "BH",
            "BD",
            "BB",
            "BY",
            "BE",
            "BZ",
            "BJ",
            "BM",
            "BT",
            "BO",
            "BQ",
            "BA",
            "BW",
            "BV",
            "BR",
            "IO",
            "BN",
            "BG",
            "BF",
            "BI",
            "CV",
            "KH",
            "CM",
            "CA",
            "KY",
            "CF",
            "TD",
            "CL",
            "CN",
            "CX",
            "CC",
            "CO",
            "KM",
            "CD",
            "CG",
            "CK",
            "CR",
            "HR",
            "CU",
            "CW",
            "CY",
            "CZ",
            "CI",
            "DK",
            "DJ",
            "DM",
            "DO",
            "EC",
            "EG",
            "SV",
            "GQ",
            "ER",
            "EE",
            "SZ",
            "ET",
            "FK",
            "FO",
            "FJ",
            "FI",
            "FR",
            "GF",
            "PF",
            "TF",
            "GA",
            "GM",
            "GE",
            "DE",
            "GH",
            "GI",
            "GR",
            "GL",
            "GD",
            "GP",
            "GU",
            "GT",
            "GG",
            "GN",
            "GW",
            "GY",
            "HT",
            "HM",
            "VA",
            "HN",
            "HK",
            "HU",
            "IS",
            "IN",
            "ID",
            "IR",
            "IQ",
            "IE",
            "IM",
            "IL",
            "IT",
            "JM",
            "JP",
            "JE",
            "JO",
            "KZ",
            "KE",
            "KI",
            "KP",
            "KR",
            "KW",
            "KG",
            "LA",
            "LV",
            "LB",
            "LS",
            "LR",
            "LY",
            "LI",
            "LT",
            "LU",
            "MO",
            "MG",
            "MW",
            "MY",
            "MV",
            "ML",
            "MT",
            "MH",
            "MQ",
            "MR",
            "MU",
            "YT",
            "MX",
            "FM",
            "MD",
            "MC",
            "MN",
            "ME",
            "MS",
            "MA",
            "MZ",
            "MM",
            "NA",
            "NR",
            "NP",
            "NL",
            "NC",
            "NZ",
            "NI",
            "NE",
            "NG",
            "NU",
            "NF",
            "MP",
            "NO",
            "OM",
            "PK",
            "PW",
            "PS",
            "PA",
            "PG",
            "PY",
            "PE",
            "PH",
            "PN",
            "PL",
            "PT",
            "PR",
            "QA",
            "MK",
            "RO",
            "RU",
            "RW",
            "RE",
            "BL",
            "SH",
            "KN",
            "LC",
            "MF",
            "PM",
            "VC",
            "WS",
            "SM",
            "ST",
            "SA",
            "SN",
            "RS",
            "SC",
            "SL",
            "SG",
            "SX",
            "SK",
            "SI",
            "SB",
            "SO",
            "ZA",
            "GS",
            "SS",
            "ES",
            "LK",
            "SD",
            "SR",
            "SJ",
            "SE",
            "CH",
            "SY",
            "TW",
            "TJ",
            "TZ",
            "TH",
            "TL",
            "TG",
            "TK",
            "TO",
            "TT",
            "TN",
            "TR",
            "TM",
            "TC",
            "TV",
            "UG",
            "UA",
            "AE",
            "GB",
            "UM",
            "US",
            "UY",
            "UZ",
            "VU",
            "VE",
            "VN",
            "VG",
            "VI",
            "WF",
            "EH",
            "YE",
            "ZM",
            "ZW",
            "AX"
        };

        public static async Task Seed(IServiceProvider serviceProvider)
        {
            var dbContext = serviceProvider.GetService<CryptExDbContext>();
            var userManager = serviceProvider.GetService<UserManager<AppUser>>();
            var roleManager = serviceProvider.GetService<RoleManager<AppRole>>();

            if (!await roleManager.RoleExistsAsync("user"))
            {
                await roleManager.CreateAsync(new AppRole("user"));
            }

            if (!await roleManager.RoleExistsAsync("admin"))
            {
                await roleManager.CreateAsync(new AppRole("admin"));
            }

            // Admin account
            if (await userManager.FindByEmailAsync("admin@cryptex-trade.tech") == null)
            {
                var user = new AppUser
                {
                    Email = "admin@cryptex-trade.tech",
                    UserName = "admin",
                    FirstName = "CryptEx",
                    LastName = "Admin",
                    BirthDay = DateTime.UnixEpoch,
                    PreferedCurrency = "CHF",
                    PreferedLanguage = "en-us",
                    CreationDate = DateTime.UnixEpoch
                };

                var result = await userManager.CreateAsync(user, "Password123$");

                if (!result.Succeeded)
                {
                    throw new IdentityException("Could not create admin account.");
                }

                await userManager.AddToRolesAsync(user, new List<string>() { "user", "admin" });
                await userManager.AddClaimsAsync(user, new List<Claim> { new Claim("premium", true.ToString()) });
            }

            // Fiats
            foreach (var (ticker, fullName) in Fiats)
            {
                if (!dbContext.Wallets.Any(x => x.Ticker == ticker))
                {
                    await dbContext.Wallets.AddAsync(new Wallet
                    {
                        Ticker = ticker,
                        FullName = fullName,
                        Type = WalletType.Fiat
                    });
                }
            }

            // Cryptos
            foreach (var (ticker, fullName) in Cryptos)
            {
                if (!dbContext.Wallets.Any(x => x.Ticker == ticker))
                {
                    await dbContext.Wallets.AddAsync(new Wallet
                    {
                        Ticker = ticker,
                        FullName = fullName,
                        Type = WalletType.Crypto
                    });
                }
                else
                {
                    // Update the name if it exists but has a different name
                    var existingWallet = dbContext.Wallets.FirstOrDefault(x => x.Ticker == ticker);
                    if (existingWallet != null && existingWallet.FullName != fullName)
                    {
                        existingWallet.FullName = fullName;
                    }
                }
            }

            // Countries
            foreach (var countryCode in Countries)
            {
                if (!dbContext.Countries.Any(x => x.Iso31661Alpha2Code == countryCode))
                {
                    await dbContext.Countries.AddAsync(new Country
                    {
                        Iso31661Alpha2Code = countryCode
                    });
                }
            }

            await dbContext.SaveChangesAsync();
        }
    }


    public interface IDataSeeder
    {
        Task Seed(IServiceProvider serviceProvider);
    }

    /// <summary>
    /// Default data when testing the application.
    /// </summary>
    public class DevelopmentDataSeeder : IDataSeeder
    {
        public async Task Seed(IServiceProvider serviceProvider)
        {
            var dbContext = serviceProvider.GetService<CryptExDbContext>();
            var userManager = serviceProvider.GetService<UserManager<AppUser>>();
            var roleManager = serviceProvider.GetService<RoleManager<AppRole>>();
            var authService = serviceProvider.GetService<IAuthService>();

            if (await userManager.FindByEmailAsync("testaccount@cryptex-trade.tech") == null) {
                await authService.CreateUser(new Models.DTO.CreateUserDTO
                {
                    Email = "testaccount@cryptex-trade.tech",
                    FirstName = "Test",
                    LastName = "Account",
                    Password = "Password123$"
                });

                var user = await userManager.FindByEmailAsync("testaccount@cryptex-trade.tech");
                var wallet = await dbContext.Wallets.SingleAsync(x => x.Ticker == "CHF");
                var btc = await dbContext.Wallets.SingleAsync(x => x.Ticker == "BTC");

                await dbContext.FiatDeposits.AddAsync(new FiatDeposit
                {
                    Amount = 20000000,
                    Status = Models.PaymentStatus.Success,
                    StripeSessionId = "TESTSESSIONID",
                    CreationDate = DateTime.UtcNow.AddDays(-3),
                    UserId = user.Id,
                    WalletId = wallet.Id
                });

                var result = await dbContext.AssetConversionLocks.AddAsync(new AssetConversionLock
                {
                    ExchangeRate = 0.000031m,
                    LeftId = wallet.Id,
                    RightId = btc.Id,
                    UserId = user.Id,
                    ExpirationUtc = DateTime.UtcNow.AddDays(-3),
                });

                await dbContext.SaveChangesAsync();

                await dbContext.AssetConversions.AddAsync(new AssetConversion
                {
                    Amount = 1000000,
                    PriceLockId = result.Entity.Id,
                    UserId = user.Id,
                    Status = Models.PaymentStatus.Success
                });

                await dbContext.SaveChangesAsync();
            }
        }
    }

    /// <summary>
    /// Default data when in production.
    /// </summary>
    public class ProductionDataSeeder : IDataSeeder
    {
        public async Task Seed(IServiceProvider serviceProvider)
        {
            var userManager = serviceProvider.GetService<UserManager<AppUser>>();
            var roleManager = serviceProvider.GetService<RoleManager<AppRole>>();

            //Add as necessary.
        }
    }
}

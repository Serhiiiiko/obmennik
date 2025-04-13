using System;
using System.IO;
using System.Threading.Tasks;
using CryptExApi.Data;
using Microsoft.Extensions.DependencyInjection;
using Newtonsoft.Json;
using System.Linq;
using CryptExApi.Models.Database;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using Microsoft.AspNetCore.Identity;

namespace CryptExApi.Utilities
{
    public class StringBooleanConverter : JsonConverter
    {
        public override bool CanConvert(Type objectType)
        {
            return objectType == typeof(bool);
        }

        public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
        {
            if (reader.Value == null)
                return false;

            if (reader.Value is long)
                return Convert.ToInt64(reader.Value) != 0;

            if (reader.Value is string)
            {
                string stringValue = reader.Value.ToString();
                if (stringValue == "1" || stringValue.ToLower() == "true")
                    return true;
                if (stringValue == "0" || stringValue.ToLower() == "false")
                    return false;
            }

            return Convert.ToBoolean(reader.Value);
        }

        public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
        {
            writer.WriteValue((bool)value);
        }
    }

    // Helper class for user role data
    public class UserRoleData
    {
        public string UserId { get; set; }
        public string RoleId { get; set; }
    }

    public class JsonDataSeeder
    {
        private static JsonSerializerSettings GetJsonSettings()
        {
            return new JsonSerializerSettings
            {
                Converters = new List<JsonConverter> { new StringBooleanConverter() }
            };
        }

        public static async Task SeedFromJson(IServiceProvider serviceProvider)
        {
            var dbContext = serviceProvider.GetRequiredService<CryptExDbContext>();
            var jsonDirectory = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Data", "SeederDataJson");

            if (!Directory.Exists(jsonDirectory))
            {
                Console.WriteLine($"JSON directory not found: {jsonDirectory}");
                return;
            }

            try
            {
                // Skip user and role seeding
                // await SeedAspNetUsers(dbContext, jsonDirectory);
                // await SeedAspNetRoles(dbContext, jsonDirectory);
                // await SeedAspNetUserRoles(dbContext, jsonDirectory);

                await SeedCountries(dbContext, jsonDirectory);
                await SeedWallets(dbContext, jsonDirectory);

                // Then seed tables with dependencies
                await SeedFiatDeposits(dbContext, jsonDirectory);
                await SeedCryptoDeposits(dbContext, jsonDirectory);
                await SeedAssetConversionLocks(dbContext, jsonDirectory);
                await SeedAssetConversions(dbContext, jsonDirectory);
                await SeedAnonymousExchanges(dbContext, jsonDirectory);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error during seeding: {ex.Message}");
            }
        }

        private static async Task SeedWallets(CryptExDbContext dbContext, string jsonDirectory)
        {
            var filePath = Path.Combine(jsonDirectory, "Wallets.json");
            if (!File.Exists(filePath)) return;

            var json = await File.ReadAllTextAsync(filePath);
            var items = JsonConvert.DeserializeObject<List<Wallet>>(json, GetJsonSettings());

            if (items == null || !items.Any()) return;

            // Check if wallets already exist to avoid duplicates
            var existingWalletIds = await dbContext.Wallets.Select(w => w.Id).ToListAsync();

            int walletsAdded = 0;
            foreach (var wallet in items)
            {
                if (existingWalletIds.Contains(wallet.Id))
                    continue;

                try
                {
                    await dbContext.Wallets.AddAsync(wallet);
                    await dbContext.SaveChangesAsync();
                    walletsAdded++;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error adding wallet {wallet.Ticker}: {ex.Message}");
                    dbContext.ChangeTracker.Clear();
                }
            }

            Console.WriteLine($"Seeded {walletsAdded} wallets");
        }

        private static async Task SeedAnonymousExchanges(CryptExDbContext dbContext, string jsonDirectory)
        {
            var filePath = Path.Combine(jsonDirectory, "AnonymousExchanges.json");
            if (!File.Exists(filePath)) return;

            var json = await File.ReadAllTextAsync(filePath);
            var items = JsonConvert.DeserializeObject<List<AnonymousExchange>>(json, GetJsonSettings());

            if (items == null || !items.Any()) return;

            // Get existing wallet IDs and exchange IDs
            var walletIds = await dbContext.Wallets.Select(w => w.Id).ToListAsync();
            var existingExchangeIds = await dbContext.AnonymousExchanges.Select(e => e.Id).ToListAsync();

            int exchangesAdded = 0;
            foreach (var exchange in items)
            {
                if (existingExchangeIds.Contains(exchange.Id))
                    continue;

                if (!walletIds.Contains(exchange.SourceWalletId) ||
                    !walletIds.Contains(exchange.DestinationWalletId))
                {
                    Console.WriteLine($"Skipping exchange {exchange.Id}: Source or destination wallet not found");
                    continue;
                }

                try
                {
                    await dbContext.AnonymousExchanges.AddAsync(exchange);
                    await dbContext.SaveChangesAsync();
                    exchangesAdded++;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error adding exchange {exchange.Id}: {ex.Message}");
                    dbContext.ChangeTracker.Clear();
                }
            }

            Console.WriteLine($"Seeded {exchangesAdded} anonymous exchanges");
        }

        private static async Task SeedCountries(CryptExDbContext dbContext, string jsonDirectory)
        {
            var filePath = Path.Combine(jsonDirectory, "Countries.json");
            if (!File.Exists(filePath)) return;

            var json = await File.ReadAllTextAsync(filePath);
            var items = JsonConvert.DeserializeObject<List<Country>>(json, GetJsonSettings());

            if (items == null || !items.Any()) return;

            var existingCountryIds = await dbContext.Countries.Select(c => c.Id).ToListAsync();

            int countriesAdded = 0;
            foreach (var country in items)
            {
                if (existingCountryIds.Contains(country.Id))
                    continue;

                try
                {
                    await dbContext.Countries.AddAsync(country);
                    await dbContext.SaveChangesAsync();
                    countriesAdded++;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error adding country {country.Iso31661Alpha2Code}: {ex.Message}");
                    dbContext.ChangeTracker.Clear();
                }
            }

            Console.WriteLine($"Seeded {countriesAdded} countries");
        }

        private static async Task SeedCryptoDeposits(CryptExDbContext dbContext, string jsonDirectory)
        {
            var filePath = Path.Combine(jsonDirectory, "CryptoDeposits.json");
            if (!File.Exists(filePath)) return;

            var json = await File.ReadAllTextAsync(filePath);
            var items = JsonConvert.DeserializeObject<List<CryptoDeposit>>(json, GetJsonSettings());

            if (items == null || !items.Any()) return;

            // Get existing user and wallet IDs to verify FK constraints
            var userIds = await dbContext.Users.Select(u => u.Id).ToListAsync();
            var walletIds = await dbContext.Wallets.Select(w => w.Id).ToListAsync();
            var existingDepositIds = await dbContext.CryptoDeposits.Select(d => d.Id).ToListAsync();

            int depositsAdded = 0;
            foreach (var deposit in items)
            {
                if (existingDepositIds.Contains(deposit.Id))
                    continue;

                if (!userIds.Contains(deposit.UserId) || !walletIds.Contains(deposit.WalletId))
                {
                    Console.WriteLine($"Skipping crypto deposit {deposit.Id}: User or wallet not found");
                    continue;
                }

                try
                {
                    await dbContext.CryptoDeposits.AddAsync(deposit);
                    await dbContext.SaveChangesAsync();
                    depositsAdded++;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error adding crypto deposit {deposit.Id}: {ex.Message}");
                    dbContext.ChangeTracker.Clear();
                }
            }

            Console.WriteLine($"Seeded {depositsAdded} crypto deposits");
        }

        private static async Task SeedFiatDeposits(CryptExDbContext dbContext, string jsonDirectory)
        {
            var filePath = Path.Combine(jsonDirectory, "Fiatdeposits.json");
            if (!File.Exists(filePath)) return;

            var json = await File.ReadAllTextAsync(filePath);
            var items = JsonConvert.DeserializeObject<List<FiatDeposit>>(json, GetJsonSettings());

            if (items == null || !items.Any()) return;

            // Get existing user and wallet IDs to verify FK constraints
            var userIds = await dbContext.Users.Select(u => u.Id).ToListAsync();
            var walletIds = await dbContext.Wallets.Select(w => w.Id).ToListAsync();
            var existingDepositIds = await dbContext.FiatDeposits.Select(d => d.Id).ToListAsync();

            int depositsAdded = 0;
            foreach (var deposit in items)
            {
                if (existingDepositIds.Contains(deposit.Id))
                    continue;

                if (!userIds.Contains(deposit.UserId) || !walletIds.Contains(deposit.WalletId))
                {
                    Console.WriteLine($"Skipping fiat deposit {deposit.Id}: User or wallet not found");
                    continue;
                }

                try
                {
                    await dbContext.FiatDeposits.AddAsync(deposit);
                    await dbContext.SaveChangesAsync();
                    depositsAdded++;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error adding fiat deposit {deposit.Id}: {ex.Message}");
                    dbContext.ChangeTracker.Clear();
                }
            }

            Console.WriteLine($"Seeded {depositsAdded} fiat deposits");
        }

        private static async Task SeedAssetConversionLocks(CryptExDbContext dbContext, string jsonDirectory)
        {
            var filePath = Path.Combine(jsonDirectory, "AssetConversionLocks.json");
            if (!File.Exists(filePath)) return;

            var json = await File.ReadAllTextAsync(filePath);
            var items = JsonConvert.DeserializeObject<List<AssetConversionLock>>(json, GetJsonSettings());

            if (items == null || !items.Any()) return;

            // Get existing user and wallet IDs to verify FK constraints
            var userIds = await dbContext.Users.Select(u => u.Id).ToListAsync();
            var walletIds = await dbContext.Wallets.Select(w => w.Id).ToListAsync();
            var existingLockIds = await dbContext.AssetConversionLocks.Select(l => l.Id).ToListAsync();

            int locksAdded = 0;
            foreach (var conversionLock in items)
            {
                if (existingLockIds.Contains(conversionLock.Id))
                    continue;

                if (!userIds.Contains(conversionLock.UserId) ||
                    !walletIds.Contains(conversionLock.LeftId) ||
                    !walletIds.Contains(conversionLock.RightId))
                {
                    Console.WriteLine($"Skipping conversion lock {conversionLock.Id}: User or wallet not found");
                    continue;
                }

                try
                {
                    await dbContext.AssetConversionLocks.AddAsync(conversionLock);
                    await dbContext.SaveChangesAsync();
                    locksAdded++;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error adding conversion lock {conversionLock.Id}: {ex.Message}");
                    dbContext.ChangeTracker.Clear();
                }
            }

            Console.WriteLine($"Seeded {locksAdded} asset conversion locks");
        }

        private static async Task SeedAssetConversions(CryptExDbContext dbContext, string jsonDirectory)
        {
            var filePath = Path.Combine(jsonDirectory, "AssetConversions.json");
            if (!File.Exists(filePath)) return;

            var json = await File.ReadAllTextAsync(filePath);
            var items = JsonConvert.DeserializeObject<List<AssetConversion>>(json, GetJsonSettings());

            if (items == null || !items.Any()) return;

            // Get existing user and asset conversion lock IDs to verify FK constraints
            var userIds = await dbContext.Users.Select(u => u.Id).ToListAsync();
            var lockIds = await dbContext.AssetConversionLocks.Select(l => l.Id).ToListAsync();
            var existingConversionIds = await dbContext.AssetConversions.Select(c => c.Id).ToListAsync();

            int conversionsAdded = 0;
            foreach (var conversion in items)
            {
                if (existingConversionIds.Contains(conversion.Id))
                    continue;

                if (!userIds.Contains(conversion.UserId) || !lockIds.Contains(conversion.PriceLockId))
                {
                    Console.WriteLine($"Skipping conversion {conversion.Id}: User or price lock not found");
                    continue;
                }

                try
                {
                    await dbContext.AssetConversions.AddAsync(conversion);
                    await dbContext.SaveChangesAsync();
                    conversionsAdded++;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error adding conversion {conversion.Id}: {ex.Message}");
                    dbContext.ChangeTracker.Clear();
                }
            }

            Console.WriteLine($"Seeded {conversionsAdded} asset conversions");
        }
    }
}
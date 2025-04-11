// Create this file: src/back-end/CryptEx/CryptExApi/Utilities/JsonDataSeeder.cs
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

namespace CryptExApi.Utilities
{
    public class JsonDataSeeder
    {
        public static async Task SeedFromJson(IServiceProvider serviceProvider)
        {
            var dbContext = serviceProvider.GetRequiredService<CryptExDbContext>();
            var jsonDirectory = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Data", "SeederDataJson");

            if (!Directory.Exists(jsonDirectory))
            {
                Console.WriteLine($"JSON directory not found: {jsonDirectory}");
                return;
            }

            await SeedAnonymousExchanges(dbContext, jsonDirectory);
            await SeedAssetConversionLocks(dbContext, jsonDirectory);
            await SeedAssetConversions(dbContext, jsonDirectory);
            await SeedWallets(dbContext, jsonDirectory);
            await SeedCountries(dbContext, jsonDirectory);
            await SeedCryptoDeposits(dbContext, jsonDirectory);
            await SeedFiatDeposits(dbContext, jsonDirectory);
        }

        private static async Task SeedAnonymousExchanges(CryptExDbContext dbContext, string jsonDirectory)
        {
            var filePath = Path.Combine(jsonDirectory, "AnonymousExchanges.json");
            if (!File.Exists(filePath)) return;

            var json = await File.ReadAllTextAsync(filePath);
            var items = JsonConvert.DeserializeObject<List<AnonymousExchange>>(json);

            if (!dbContext.AnonymousExchanges.Any())
            {
                await dbContext.AnonymousExchanges.AddRangeAsync(items);
                await dbContext.SaveChangesAsync();
                Console.WriteLine($"Seeded {items.Count} anonymous exchanges");
            }
        }

        private static async Task SeedAssetConversionLocks(CryptExDbContext dbContext, string jsonDirectory)
        {
            var filePath = Path.Combine(jsonDirectory, "AssetConversionLocks.json");
            if (!File.Exists(filePath)) return;

            var json = await File.ReadAllTextAsync(filePath);
            var items = JsonConvert.DeserializeObject<List<AssetConversionLock>>(json);

            if (!dbContext.AssetConversionLocks.Any())
            {
                await dbContext.AssetConversionLocks.AddRangeAsync(items);
                await dbContext.SaveChangesAsync();
                Console.WriteLine($"Seeded {items.Count} asset conversion locks");
            }
        }

        private static async Task SeedAssetConversions(CryptExDbContext dbContext, string jsonDirectory)
        {
            var filePath = Path.Combine(jsonDirectory, "AssetConversions.json");
            if (!File.Exists(filePath)) return;

            var json = await File.ReadAllTextAsync(filePath);
            var items = JsonConvert.DeserializeObject<List<AssetConversion>>(json);

            if (!dbContext.AssetConversions.Any())
            {
                await dbContext.AssetConversions.AddRangeAsync(items);
                await dbContext.SaveChangesAsync();
                Console.WriteLine($"Seeded {items.Count} asset conversions");
            }
        }

        private static async Task SeedWallets(CryptExDbContext dbContext, string jsonDirectory)
        {
            var filePath = Path.Combine(jsonDirectory, "Wallets.json");
            if (!File.Exists(filePath)) return;

            var json = await File.ReadAllTextAsync(filePath);
            var items = JsonConvert.DeserializeObject<List<Wallet>>(json);

            if (!dbContext.Wallets.Any())
            {
                await dbContext.Wallets.AddRangeAsync(items);
                await dbContext.SaveChangesAsync();
                Console.WriteLine($"Seeded {items.Count} wallets");
            }
        }

        private static async Task SeedCountries(CryptExDbContext dbContext, string jsonDirectory)
        {
            var filePath = Path.Combine(jsonDirectory, "Countries.json");
            if (!File.Exists(filePath)) return;

            var json = await File.ReadAllTextAsync(filePath);
            var items = JsonConvert.DeserializeObject<List<Country>>(json);

            if (!dbContext.Countries.Any())
            {
                await dbContext.Countries.AddRangeAsync(items);
                await dbContext.SaveChangesAsync();
                Console.WriteLine($"Seeded {items.Count} countries");
            }
        }

        private static async Task SeedCryptoDeposits(CryptExDbContext dbContext, string jsonDirectory)
        {
            var filePath = Path.Combine(jsonDirectory, "CryptoDeposits.json");
            if (!File.Exists(filePath)) return;

            var json = await File.ReadAllTextAsync(filePath);
            var items = JsonConvert.DeserializeObject<List<CryptoDeposit>>(json);

            if (!dbContext.CryptoDeposits.Any())
            {
                await dbContext.CryptoDeposits.AddRangeAsync(items);
                await dbContext.SaveChangesAsync();
                Console.WriteLine($"Seeded {items.Count} crypto deposits");
            }
        }

        private static async Task SeedFiatDeposits(CryptExDbContext dbContext, string jsonDirectory)
        {
            var filePath = Path.Combine(jsonDirectory, "Fiatdeposits.json");
            if (!File.Exists(filePath)) return;

            var json = await File.ReadAllTextAsync(filePath);
            var items = JsonConvert.DeserializeObject<List<FiatDeposit>>(json);

            if (!dbContext.FiatDeposits.Any())
            {
                await dbContext.FiatDeposits.AddRangeAsync(items);
                await dbContext.SaveChangesAsync();
                Console.WriteLine($"Seeded {items.Count} fiat deposits");
            }
        }
    }
}
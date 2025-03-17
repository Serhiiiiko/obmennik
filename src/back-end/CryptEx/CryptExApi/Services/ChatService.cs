using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.IO;

namespace CryptEx.Services
{
    public interface IChatService
    {
        Task<bool> StoreMessage(ChatMessage message);
        Task<string> GetAutomatedResponse();
        Task<List<ChatMessage>> GetUserChatHistory(string userId);
    }

    public class ChatService : IChatService
    {
        private readonly ILogger<ChatService> _logger;
        private readonly Random _random = new Random();
        private readonly string _chatStoragePath;
        private readonly List<string> _autoResponses = new List<string>
        {
            "Спасибо за ваше сообщение. Наш оператор ответит вам в ближайшее время.",
            "Ваше сообщение получено. Мы скоро с вами свяжемся.",
            "Благодарим за обращение! Оператор ответит вам в течение нескольких минут.",
            "Ваш запрос принят. Пожалуйста, ожидайте ответа от нашей команды поддержки."
        };

        public ChatService(ILogger<ChatService> logger)
        {
            _logger = logger;
            _chatStoragePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ChatStorage");

            // Ensure chat storage directory exists
            if (!Directory.Exists(_chatStoragePath))
            {
                Directory.CreateDirectory(_chatStoragePath);
            }
        }

        public async Task<bool> StoreMessage(ChatMessage message)
        {
            try
            {
                // Add a generated ID if it doesn't have one
                if (string.IsNullOrEmpty(message.Id))
                {
                    message.Id = Guid.NewGuid().ToString();
                }

                // Generate a unique filename based on userId (or a session ID for anonymous users)
                string userId = message.UserId ?? "anonymous";
                string filePath = Path.Combine(_chatStoragePath, $"{userId}_chat.json");

                // Load existing messages or create a new list
                List<ChatMessage> messages = new List<ChatMessage>();

                if (File.Exists(filePath))
                {
                    string json = await File.ReadAllTextAsync(filePath);
                    messages = JsonSerializer.Deserialize<List<ChatMessage>>(json) ?? new List<ChatMessage>();
                }

                // Add the new message
                messages.Add(message);

                // Save the updated list
                string updatedJson = JsonSerializer.Serialize(messages);
                await File.WriteAllTextAsync(filePath, updatedJson);

                _logger.LogInformation($"Message stored: {message.Content} from {message.SenderName}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error storing chat message");
                return false;
            }
        }

        public Task<string> GetAutomatedResponse()
        {
            // Return a random automated response
            int index = _random.Next(_autoResponses.Count);
            return Task.FromResult(_autoResponses[index]);
        }

        public async Task<List<ChatMessage>> GetUserChatHistory(string userId)
        {
            try
            {
                string filePath = Path.Combine(_chatStoragePath, $"{userId}_chat.json");

                if (!File.Exists(filePath))
                {
                    return new List<ChatMessage>();
                }

                string json = await File.ReadAllTextAsync(filePath);
                return JsonSerializer.Deserialize<List<ChatMessage>>(json) ?? new List<ChatMessage>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving chat history for user {userId}");
                return new List<ChatMessage>();
            }
        }
    }

    public class ChatMessage
    {
        public string Id { get; set; }
        public string UserId { get; set; }
        public string SenderName { get; set; }
        public string Content { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public bool IsFromSupport { get; set; }
    }
}
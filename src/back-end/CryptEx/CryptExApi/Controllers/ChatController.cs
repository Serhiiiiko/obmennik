using System;
using System.Threading.Tasks;
using CryptEx.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CryptEx.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly IChatService _chatService;
        private readonly ILogger<ChatController> _logger;

        public ChatController(IChatService chatService, ILogger<ChatController> logger)
        {
            _chatService = chatService;
            _logger = logger;
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] ChatMessage message)
        {
            if (string.IsNullOrEmpty(message.Content))
            {
                return BadRequest("Message content cannot be empty");
            }

            // Set user ID from claims if authenticated, or use a session ID
            string userId = User.Identity.IsAuthenticated
                ? User.FindFirst("sub")?.Value
                : HttpContext.Request.Cookies["AnonymousChatId"];

            // Create anonymous ID if needed
            if (string.IsNullOrEmpty(userId))
            {
                userId = Guid.NewGuid().ToString();
                HttpContext.Response.Cookies.Append("AnonymousChatId", userId, new Microsoft.AspNetCore.Http.CookieOptions
                {
                    Expires = DateTimeOffset.Now.AddMonths(1),
                    HttpOnly = true,
                    SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Lax
                });
            }

            message.UserId = userId;
            var result = await _chatService.StoreMessage(message);

            if (result)
            {
                return Ok();
            }

            return StatusCode(500, "Failed to store message");
        }

        [HttpGet("automated-response")]
        public async Task<IActionResult> GetAutomatedResponse()
        {
            var response = await _chatService.GetAutomatedResponse();
            return Ok(new { response });
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetChatHistory()
        {
            string userId = User.Identity.IsAuthenticated
                ? User.FindFirst("sub")?.Value
                : HttpContext.Request.Cookies["AnonymousChatId"];

            if (string.IsNullOrEmpty(userId))
            {
                return Ok(new { messages = Array.Empty<ChatMessage>() });
            }

            var messages = await _chatService.GetUserChatHistory(userId);
            return Ok(new { messages });
        }
    }
}
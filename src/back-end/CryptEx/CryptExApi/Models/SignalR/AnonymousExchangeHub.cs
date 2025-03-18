using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace CryptExApi.Models.SignalR
{
    
    public class AnonymousExchangeHub : Hub
    {
        public const string Name = "anonymousexchangedata";
    }
}
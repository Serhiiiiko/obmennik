import { Component, OnInit, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface ChatMessage {
  content: string;
  isFromSupport: boolean;
  timestamp: Date;
}

interface StoredChatData {
  isChatOpen: boolean;
  messages: ChatMessage[];
  timestamp: string; // ISO string format
}

@Component({
  selector: 'app-chat-widget',
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.scss']
})
export class ChatWidgetComponent implements OnInit {
  isChatOpen = false;
  messages: ChatMessage[] = [];
  newMessage = '';
  isTyping = false;
  private readonly apiBaseUrl = '/api';
  private readonly STORAGE_KEY = 'cryptex_chat_data';
  
  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    // Check for and cleanup old chats first
    this.cleanupOldChats();
    
    // Then restore chat state from localStorage
    this.restoreChatState();
    
    // If no messages exist, add initial messages
    if (this.messages.length === 0) {
      this.messages.push({
        content: 'Привет 😊',
        isFromSupport: true,
        timestamp: new Date()
      });
      
      this.messages.push({
        content: 'Вы можете мне помочь?',
        isFromSupport: true,
        timestamp: new Date()
      });
      
      // Save these initial messages
      this.saveChatState();
    }
  }

  toggleChat(): void {
    this.isChatOpen = !this.isChatOpen;
    // Save chat state when toggling
    this.saveChatState();
  }

  sendMessage(): void {
    if (!this.newMessage.trim()) {
      return;
    }

    // Add user message
    this.messages.push({
      content: this.newMessage,
      isFromSupport: false,
      timestamp: new Date()
    });

    // Save state after adding user message
    this.saveChatState();

    // Clear input
    const userMessage = this.newMessage;
    this.newMessage = '';

    // Simulate typing indicator
    this.isTyping = true;
    
    // Send message to backend
    this.http.post(`${this.apiBaseUrl}/chat/send`, {
      content: userMessage,
      senderName: 'Пользователь',
      isFromSupport: false
    }).subscribe(
      () => {
        // Get automated response
        setTimeout(() => {
          this.isTyping = false;
          this.getAutomatedResponse();
        }, 1500);
      },
      (error) => {
        console.error('Error sending message', error);
        this.isTyping = false;
        // Still show automatic response even if API call fails
        this.getAutomatedResponse();
      }
    );
  }

  private getAutomatedResponse(): void {
    this.http.get<{response: string}>(`${this.apiBaseUrl}/chat/automated-response`)
      .subscribe(
        (data) => {
          this.messages.push({
            content: data.response || 'Спасибо за ваше сообщение. Наш оператор ответит вам в ближайшее время.',
            isFromSupport: true,
            timestamp: new Date()
          });
          // Save state after receiving response
          this.saveChatState();
        },
        (error) => {
          console.error('Error getting automated response', error);
          // Fallback response if API call fails
          this.messages.push({
            content: 'Спасибо за ваше сообщение. Наш оператор ответит вам в ближайшее время.',
            isFromSupport: true,
            timestamp: new Date()
          });
          // Save state after receiving fallback response
          this.saveChatState();
        }
      );
  }
  
  // Method to handle predefined questions
  sendPredefinedQuestion(question: string): void {
    this.newMessage = question;
    this.sendMessage();
  }

  // Save chat state to localStorage
  private saveChatState(): void {
    try {
      const chatData: StoredChatData = {
        isChatOpen: this.isChatOpen,
        messages: this.messages,
        timestamp: new Date().toISOString() // Store the current time
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(chatData));
    } catch (error) {
      console.error('Error saving chat state to localStorage:', error);
    }
  }

  // Restore chat state from localStorage
  private restoreChatState(): void {
    try {
      const savedData = localStorage.getItem(this.STORAGE_KEY);
      
      if (savedData) {
        const chatData = JSON.parse(savedData) as StoredChatData;
        
        // Restore chat open/closed state
        this.isChatOpen = chatData.isChatOpen;
        
        // Restore messages, converting string timestamps back to Date objects
        this.messages = chatData.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error restoring chat state from localStorage:', error);
      // If there's an error, reset to empty chat
      this.messages = [];
      this.isChatOpen = false;
    }
  }

  // Save chat state when user leaves or refreshes page
  @HostListener('window:beforeunload')
  saveBeforeUnload(): void {
    this.saveChatState();
  }

  // Clean up old chats older than 12 hours
  private cleanupOldChats(): void {
    try {
      const savedData = localStorage.getItem(this.STORAGE_KEY);
      
      if (savedData) {
        const chatData = JSON.parse(savedData) as StoredChatData;
        
        if (!chatData.timestamp) {
          // If no timestamp exists (older version of chat data), recreate it
          this.saveChatState();
          return;
        }
        
        const chatTimestamp = new Date(chatData.timestamp);
        const twelveHoursAgo = new Date();
        twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);
        
        if (chatTimestamp < twelveHoursAgo) {
          console.log('Chat is older than 12 hours, clearing chat data');
          localStorage.removeItem(this.STORAGE_KEY);
          this.messages = [];
          this.isChatOpen = false;
        }
      }
    } catch (error) {
      console.error('Error cleaning up old chats:', error);
    }
  }
}
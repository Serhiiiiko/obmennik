import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class TidioChatService {
  private readonly STORAGE_KEY = 'tidio_chat_key';
  private readonly DEFAULT_KEY = 'chowvcoz32uaokncs5k5uwbskbeozb2j';
  private scriptElement: HTMLScriptElement | null = null;
  
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Initialize the Tidio chat widget
   */
  public initialize(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Load the script with the stored key or default key
      const tidioChatKey = this.getTidioChatKey();
      this.loadTidioScript(tidioChatKey);
    }
  }

  /**
   * Set a new Tidio chat key and reload the script
   */
  public setTidioChatKey(key: string): boolean {
    if (!key) {
      console.error('Invalid Tidio chat key');
      return false;
    }

    try {
      // Store the new key
      localStorage.setItem(this.STORAGE_KEY, key);
      
      // Remove existing script if present
      this.removeTidioScript();
      
      // Load new script
      this.loadTidioScript(key);
      
      console.log(`Tidio chat key updated to: ${key}`);
      return true;
    } catch (error) {
      console.error('Error updating Tidio chat key:', error);
      return false;
    }
  }

  /**
   * Get the current Tidio chat key
   */
  public getTidioChatKey(): string {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.STORAGE_KEY) || this.DEFAULT_KEY;
    }
    return this.DEFAULT_KEY;
  }

  /**
   * Load the Tidio script with the given key
   */
  private loadTidioScript(key: string): void {
    if (!key) {
      console.error('Invalid Tidio key provided');
      return;
    }

    // Create script element
    this.scriptElement = document.createElement('script');
    this.scriptElement.src = `//code.tidio.co/${key}.js`;
    this.scriptElement.async = true;
    
    // Append to document
    document.body.appendChild(this.scriptElement);
  }

  /**
   * Remove the Tidio script from the DOM
   */
  private removeTidioScript(): void {
    if (this.scriptElement && this.scriptElement.parentNode) {
      this.scriptElement.parentNode.removeChild(this.scriptElement);
      this.scriptElement = null;
      
      // Also remove any Tidio related elements
      const tidioElements = document.querySelectorAll('[id^="tidio"]');
      tidioElements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    }
  }
}
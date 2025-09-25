/**
 * Chinese Tutor Embeddable Chat Widget
 * Easy integration for any website
 */

(function() {
  'use strict';

  class ChineseTutorWidget {
    constructor(config = {}) {
      this.config = {
        apiUrl: config.apiUrl || 'https://chinese-tutor.vercel.app',
        theme: config.theme || 'light',
        position: config.position || 'bottom-right',
        width: config.width || '400px',
        height: config.height || '600px',
        title: config.title || 'Chinese Tutor',
        placeholder: config.placeholder || 'Ask me anything in Chinese...',
        autoOpen: config.autoOpen || false,
        ...config
      };

      this.isOpen = this.config.autoOpen;
      this.container = null;
      this.iframe = null;
      
      this.init();
    }

    init() {
      this.createContainer();
      this.createToggleButton();
      this.setupEventListeners();
      
      if (this.isOpen) {
        this.openChat();
      }
    }

    createContainer() {
      this.container = document.createElement('div');
      this.container.id = 'chinese-tutor-widget';
      this.container.style.cssText = this.getContainerStyles();
      document.body.appendChild(this.container);
    }

    getContainerStyles() {
      const baseStyles = `
        position: fixed;
        z-index: 9999;
        transition: all 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      switch (this.config.position) {
        case 'bottom-right':
          return baseStyles + 'bottom: 20px; right: 20px;';
        case 'bottom-left':
          return baseStyles + 'bottom: 20px; left: 20px;';
        case 'top-right':
          return baseStyles + 'top: 20px; right: 20px;';
        case 'top-left':
          return baseStyles + 'top: 20px; left: 20px;';
        default:
          return baseStyles + 'bottom: 20px; right: 20px;';
      }
    }

    createToggleButton() {
      const button = document.createElement('button');
      button.id = 'chinese-tutor-toggle';
      button.innerHTML = '💬';
      button.style.cssText = `
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: none;
        background: ${this.config.theme === 'dark' ? '#1e40af' : '#3b82f6'};
        color: white;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.2s ease;
        display: ${this.isOpen ? 'none' : 'flex'};
        align-items: center;
        justify-content: center;
      `;

      button.onmouseover = () => {
        button.style.transform = 'scale(1.05)';
        button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
      };

      button.onmouseout = () => {
        button.style.transform = 'scale(1)';
        button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      };

      button.onclick = () => this.openChat();
      this.container.appendChild(button);
      this.toggleButton = button;
    }

    openChat() {
      this.isOpen = true;
      this.toggleButton.style.display = 'none';
      
      if (!this.iframe) {
        this.createChatIframe();
      }
      
      this.iframe.style.display = 'block';
    }

    closeChat() {
      this.isOpen = false;
      this.toggleButton.style.display = 'flex';
      
      if (this.iframe) {
        this.iframe.style.display = 'none';
      }
    }

    createChatIframe() {
      this.iframe = document.createElement('iframe');
      this.iframe.src = `${this.config.apiUrl}/embed?theme=${this.config.theme}&title=${encodeURIComponent(this.config.title)}`;
      this.iframe.style.cssText = `
        width: ${this.config.width};
        height: ${this.config.height};
        border: none;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        background: white;
        display: ${this.isOpen ? 'block' : 'none'};
      `;

      this.container.appendChild(this.iframe);
    }

    setupEventListeners() {
      // Listen for messages from iframe
      window.addEventListener('message', (event) => {
        if (event.origin !== this.config.apiUrl.replace(/\/$/, '')) return;
        
        if (event.data.type === 'CLOSE_CHAT') {
          this.closeChat();
        }
      });

      // Close on escape key
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && this.isOpen) {
          this.closeChat();
        }
      });
    }

    destroy() {
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
    }
  }

  // Auto-initialize if config found
  window.ChineseTutorWidget = ChineseTutorWidget;

  // Auto-init from script attributes
  document.addEventListener('DOMContentLoaded', function() {
    const script = document.querySelector('script[src*="embed-chinese-tutor.js"]');
    if (script) {
      const config = {
        apiUrl: script.getAttribute('data-api-url'),
        theme: script.getAttribute('data-theme'),
        position: script.getAttribute('data-position'),
        width: script.getAttribute('data-width'),
        height: script.getAttribute('data-height'),
        title: script.getAttribute('data-title'),
        autoOpen: script.getAttribute('data-auto-open') === 'true'
      };

      // Remove null/undefined values
      Object.keys(config).forEach(key => {
        if (config[key] === null || config[key] === undefined) {
          delete config[key];
        }
      });

      new ChineseTutorWidget(config);
    }
  });

})();
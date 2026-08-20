/* ===================================================================
   FLOATING AI WIDGET — Quick Ask AI on Every Page
   =================================================================== */

(function() {
  'use strict';

  const { EventBus, UI } = window.HuntDrop;

  // ===== Create Widget HTML =====
  function createWidget() {
    const widget = document.createElement('div');
    widget.innerHTML = `
      <button class="ai-widget-btn" id="aiWidgetBtn" title="Ask AI">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a7 7 0 0 0-7 7c0 3 2 5.5 4 7.5L12 22l3-5.5c2-2 4-4.5 4-7.5a7 7 0 0 0-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
      </button>
      
      <div class="ai-widget-chat" id="aiWidgetChat">
        <div class="ai-widget-header">
          <div class="ai-widget-header-left">
            <div class="ai-widget-avatar">🤖</div>
            <div>
              <div class="ai-widget-title">AI Assistant</div>
              <div class="ai-widget-status">Online</div>
            </div>
          </div>
          <button class="ai-widget-close" id="aiWidgetClose">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <div class="ai-widget-messages" id="aiWidgetMessages">
          <div class="ai-widget-message ai">
            <div class="ai-widget-msg-avatar">🤖</div>
            <div class="ai-widget-msg-bubble">
              Hi! I'm your AI assistant. Ask me anything about products, suppliers, pricing, or marketing strategies.
            </div>
          </div>
        </div>
        
        <div class="ai-widget-input">
          <input type="text" id="aiWidgetInput" placeholder="Ask me anything..." />
          <button class="ai-widget-send" id="aiWidgetSend" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(widget);
  }

  // ===== Initialize Widget =====
  function initWidget() {
    createWidget();

    const btn = document.getElementById('aiWidgetBtn');
    const chat = document.getElementById('aiWidgetChat');
    const close = document.getElementById('aiWidgetClose');
    const input = document.getElementById('aiWidgetInput');
    const send = document.getElementById('aiWidgetSend');
    const messages = document.getElementById('aiWidgetMessages');

    // Toggle chat
    btn.addEventListener('click', () => {
      chat.classList.toggle('open');
      if (chat.classList.contains('open')) {
        input.focus();
      }
    });

    close.addEventListener('click', () => {
      chat.classList.remove('open');
    });

    // Enable/disable send button
    input.addEventListener('input', () => {
      send.disabled = input.value.trim() === '';
    });

    // Send message
    send.addEventListener('click', () => sendMessage());
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        sendMessage();
      }
    });

    function sendMessage() {
      const text = input.value.trim();
      if (!text) return;

      // Add user message
      addMessage(text, 'user');
      input.value = '';
      send.disabled = true;

      // Show typing indicator
      const typing = document.createElement('div');
      typing.className = 'ai-widget-message ai';
      typing.innerHTML = `
        <div class="ai-widget-msg-avatar">🤖</div>
        <div class="ai-widget-msg-bubble">
          <div class="ai-widget-typing">
            <span></span><span></span><span></span>
          </div>
        </div>
      `;
      messages.appendChild(typing);
      messages.scrollTop = messages.scrollHeight;

      // Simulate AI response (replace with actual AI call)
      setTimeout(() => {
        typing.remove();
        const response = generateResponse(text);
        addMessage(response, 'ai');
      }, 1500);
    }

    function addMessage(text, type) {
      const msg = document.createElement('div');
      msg.className = `ai-widget-message ${type}`;
      msg.innerHTML = `
        <div class="ai-widget-msg-avatar">${type === 'ai' ? '🤖' : '👤'}</div>
        <div class="ai-widget-msg-bubble">${text}</div>
      `;
      messages.appendChild(msg);
      messages.scrollTop = messages.scrollHeight;
    }

    function generateResponse(query) {
      const lower = query.toLowerCase();
      
      if (lower.includes('product') || lower.includes('find') || lower.includes('trending')) {
        return "I can help you find winning products! Try using the Product Finder page to search across multiple platforms. You can filter by price, margin, and competition level.";
      }
      if (lower.includes('profit') || lower.includes('margin') || lower.includes('price')) {
        return "For profit calculations, check out the Profit Hub. You can input your product cost, selling price, and shipping to see your exact margins.";
      }
      if (lower.includes('supplier') || lower.includes('source')) {
        return "The Supplier Center shows verified suppliers with ratings, delivery times, and reliability scores. You can compare multiple suppliers side by side.";
      }
      if (lower.includes('ad') || lower.includes('marketing') || lower.includes('campaign')) {
        return "The Marketing Hub can generate ad copy for Facebook, TikTok, and Instagram. It also includes budget allocation and content calendar planning.";
      }
      if (lower.includes('competitor') || lower.includes('spy')) {
        return "Use the Competitor Intel page to spy on competitor stores, see their revenue, tech stack, and ad strategies.";
      }
      
      return "That's a great question! I can help with product research, profit calculations, supplier verification, competitor analysis, and marketing strategies. What specific area would you like to explore?";
    }

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!chat.contains(e.target) && !btn.contains(e.target)) {
        chat.classList.remove('open');
      }
    });
  }

  // ===== Initialize on DOM Ready =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();
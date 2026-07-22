// ============================================================================
// PLUGIN: AI Chat Widget — Floating chat button + popup from any page
// ============================================================================
(function () {
  const { PluginRegistry, EventBus, UI, Config } = window.HuntDrop;
  if (!PluginRegistry) return;

  const _state = {
    open: false,
    history: [],
    sending: false,
    container: null,
  };

  const LS_HISTORY_KEY = 'huntdrop_chat_history';

  function esc(s) {
    return UI.escapeHtml(String(s || ''));
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(LS_HISTORY_KEY);
      if (raw) _state.history = JSON.parse(raw);
    } catch (e) {
      _state.history = [];
    }
  }

  function saveHistory() {
    try {
      const toSave = _state.history.slice(-50);
      localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(toSave));
    } catch (e) {
      /* quota */
    }
  }

  function renderMarkdown(text) {
    let html = esc(text);
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function renderMessages() {
    const el = document.getElementById('chatWidgetMessages');
    if (!el) return;
    if (_state.history.length === 0) {
      el.innerHTML =
        '<div class="cw-welcome">' +
        '<div class="cw-welcome-icon">&#x1F4AC;</div>' +
        '<div class="cw-welcome-title">HuntDrop AI Assistant</div>' +
        '<div class="cw-welcome-desc">Ask me anything about products, suppliers, ads, or strategy.</div>' +
        '<div class="cw-quick-actions">' +
        '<button class="cw-quick-btn" data-q="What should I sell today?">What to sell?</button>' +
        '<button class="cw-quick-btn" data-q="Show best suppliers">Best suppliers</button>' +
        '<button class="cw-quick-btn" data-q="Generate TikTok ad copy">TikTok ads</button>' +
        '<button class="cw-quick-btn" data-q="What are my profit margins?">Profit check</button>' +
        '<button class="cw-quick-btn" data-q="I have $500, where should I start?">Start with $500</button>' +
        '</div></div>';
      return;
    }
    let html = '';
    _state.history.forEach(function (msg) {
      const isUser = msg.role === 'user';
      html +=
        '<div class="cw-msg cw-msg-' +
        (isUser ? 'user' : 'ai') +
        '">' +
        '<div class="cw-msg-avatar">' +
        (isUser ? '&#x1F464;' : '&#x1F916;') +
        '</div>' +
        '<div class="cw-msg-body">' +
        '<div class="cw-msg-content">' +
        (isUser ? esc(msg.content) : renderMarkdown(msg.content)) +
        '</div>' +
        '</div></div>';
    });
    if (_state.sending) {
      html +=
        '<div class="cw-msg cw-msg-ai">' +
        '<div class="cw-msg-avatar">&#x1F916;</div>' +
        '<div class="cw-msg-body"><div class="cw-msg-content cw-typing">' +
        '<span></span><span></span><span></span></div></div></div>';
    }
    el.innerHTML = html;
    el.scrollTop = el.scrollHeight;
  }

  async function sendMessage(text) {
    if (!text || _state.sending) return;
    _state.sending = true;
    _state.history.push({ role: 'user', content: text, ts: Date.now() });
    saveHistory();
    renderMessages();

    const input = document.getElementById('chatWidgetInput');
    if (input) input.value = '';

    try {
      const result = await window.HuntDrop.AIChatService.sendMessage(text, _state.history.slice(0, -1));
      const response = result.response || 'Sorry, something went wrong.';
      _state.history.push({ role: 'assistant', content: response, ts: Date.now() });
      saveHistory();
    } catch (e) {
      _state.history.push({
        role: 'assistant',
        content: 'Error: ' + (e.message || 'Unknown error') + '. Check your AI API key in Settings.',
        ts: Date.now(),
      });
      saveHistory();
    }

    _state.sending = false;
    renderMessages();
  }

  function buildHTML() {
    return (
      '<div class="cw-fab" id="chatWidgetFab" title="Chat with AI" role="button" tabindex="0">' +
      '<svg class="cw-fab-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>' +
      '</svg>' +
      '<svg class="cw-fab-close" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>' +
      '</svg>' +
      '</div>' +
      '<div class="cw-panel" id="chatWidgetPanel">' +
      '<div class="cw-header">' +
      '<div class="cw-header-left">' +
      '<div class="cw-header-avatar">&#x1F916;</div>' +
      '<div><div class="cw-header-title">HuntDrop AI</div>' +
      '<div class="cw-header-status">Online</div></div>' +
      '</div>' +
      '<div class="cw-header-actions">' +
      '<button class="cw-header-btn" id="chatWidgetClear" title="Clear chat">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
      '</button>' +
      '<button class="cw-header-btn" id="chatWidgetClose" title="Close">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button>' +
      '</div>' +
      '</div>' +
      '<div class="cw-messages" id="chatWidgetMessages"></div>' +
      '<div class="cw-input-area">' +
      '<input type="text" class="cw-input" id="chatWidgetInput" placeholder="Ask about products, suppliers, ads..." autocomplete="off" />' +
      '<button class="cw-send" id="chatWidgetSend" title="Send">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
      '</button>' +
      '</div>' +
      '</div>'
    );
  }

  function bindEvents() {
    const fab = document.getElementById('chatWidgetFab');
    const panel = document.getElementById('chatWidgetPanel');
    const input = document.getElementById('chatWidgetInput');
    const sendBtn = document.getElementById('chatWidgetSend');
    const clearBtn = document.getElementById('chatWidgetClear');
    const closeBtn = document.getElementById('chatWidgetClose');

    if (fab) {
      fab.addEventListener('click', function () {
        _state.open = !_state.open;
        panel.classList.toggle('cw-open', _state.open);
        fab.classList.toggle('cw-active', _state.open);
        if (_state.open && input) {
          setTimeout(function () {
            input.focus();
          }, 200);
        }
      });
      fab.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fab.click();
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        _state.open = false;
        panel.classList.remove('cw-open');
        if (fab) fab.classList.remove('cw-active');
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        _state.history = [];
        saveHistory();
        renderMessages();
      });
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', function () {
        sendMessage(input ? input.value.trim() : '');
      });
    }

    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage(input.value.trim());
        }
      });
    }

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.cw-panel') && !e.target.closest('.cw-fab') && _state.open) {
        _state.open = false;
        if (panel) panel.classList.remove('cw-open');
        if (fab) fab.classList.remove('cw-active');
      }
    });

    document.addEventListener('click', function (e) {
      var qb = e.target.closest('.cw-quick-btn');
      if (qb) {
        sendMessage(qb.getAttribute('data-q'));
      }
    });
  }

  PluginRegistry.register('ai-chat-widget', {
    id: 'ai-chat-widget',
    name: 'AI Chat Widget',
    version: '1.0.0',
    dependencies: ['ai-chat-service'],

    init: function () {
      loadHistory();
    },

    mount: function () {
      if (document.getElementById('chatWidgetFab')) return;

      var wrapper = document.createElement('div');
      wrapper.className = 'cw-wrapper';
      wrapper.innerHTML = buildHTML();
      document.body.appendChild(wrapper);
      _state.container = wrapper;

      renderMessages();
      bindEvents();
    },

    unmount: function () {
      if (_state.container) {
        _state.container.remove();
        _state.container = null;
      }
    },
  });
})();

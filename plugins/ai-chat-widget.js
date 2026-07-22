// ============================================================================
// PLUGIN: AI Chat Widget — Floating chat button + popup (fully standalone)
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
      localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(_state.history.slice(-50)));
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
        '</div></div></div>';
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

  function getApiKey() {
    try {
      if (window.HuntDrop.APIKeyManager && typeof window.HuntDrop.APIKeyManager.getFeatureKey === 'function') {
        return window.HuntDrop.APIKeyManager.getFeatureKey('ai-chat-widget');
      }
    } catch (e) {
      /* ignore */
    }
    return Promise.resolve({ provider: null, key: null });
  }

  function getSystemPrompt() {
    var products = window.HuntDrop.ALL_PRODUCTS || [];
    var prompt = 'You are HuntDrop AI — an expert dropshipping business advisor. Be concise and actionable.\n\n';
    if (products.length > 0) {
      prompt += 'PRODUCTS (' + products.length + '):\n';
      products.slice(0, 10).forEach(function (p) {
        prompt +=
          '- ' + p.title + ' (' + p.platform + ') Score:' + p.score + ' Margin:' + p.margin + '% $' + p.price + '\n';
      });
      prompt += '\n';
    }
    prompt +=
      'RULES: Use markdown. Be concise. Give data-driven advice. Include PROCEED/CAUTION/RECONSIDER when evaluating products.';
    return prompt;
  }

  async function callGroq(messages) {
    var keyData = await getApiKey();
    if (!keyData || !keyData.key) {
      return getLocalResponse();
    }
    var provider = keyData.provider || 'groq';
    var key = keyData.key;
    var config = window.HuntDrop.APIKeyManager.providers && window.HuntDrop.APIKeyManager.providers[provider];
    if (!config) return getLocalResponse();

    var model = 'llama3-70b-8192';
    try {
      model = window.HuntDrop.APIKeyManager.getModel();
    } catch (e) {
      /* use default */
    }

    var headers = { 'Content-Type': 'application/json' };
    if (provider === 'anthropic') {
      headers = { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' };
    } else {
      headers = { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
    }

    var body;
    if (provider === 'anthropic') {
      var systemMsg = '';
      var chatMsgs = [];
      messages.forEach(function (m) {
        if (m.role === 'system') systemMsg = m.content;
        else chatMsgs.push(m);
      });
      body = JSON.stringify({ model: model, system: systemMsg, messages: chatMsgs, max_tokens: 2000 });
    } else {
      body = JSON.stringify({ model: model, messages: messages, temperature: 0.7, max_tokens: 2000 });
    }

    var resp = await fetch(config.endpoint, { method: 'POST', headers: headers, body: body });
    if (!resp.ok) throw new Error('API returned ' + resp.status);
    var data = await resp.json();

    if (provider === 'anthropic') return data.content[0].text;
    return data.choices[0].message.content;
  }

  function getLocalResponse() {
    return (
      '**AI is not configured.**\n\n' +
      'To get AI-powered responses, add your API key in **Strategy → AI Settings**.\n\n' +
      'I support: Groq (free), OpenAI, Anthropic, Google AI, and many more.\n\n' +
      'In the meantime, try these tools:\n' +
      '- 🔍 **Find Products** — Research trending products\n' +
      '- 💰 **Profit Calculator** — Calculate margins\n' +
      '- 📢 **Ad Studio** — Generate ad copy\n' +
      '- 🏭 **Supplier Hub** — Find the best suppliers'
    );
  }

  async function sendMessage(text) {
    if (!text || _state.sending) return;
    _state.sending = true;
    _state.history.push({ role: 'user', content: text, ts: Date.now() });
    saveHistory();
    renderMessages();

    var input = document.getElementById('chatWidgetInput');
    if (input) input.value = '';

    try {
      var messages = [{ role: 'system', content: getSystemPrompt() }];
      var recent = _state.history.slice(0, -1).slice(-10);
      recent.forEach(function (m) {
        messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
      });
      messages.push({ role: 'user', content: text });

      var response = await callGroq(messages);
      _state.history.push({ role: 'assistant', content: response, ts: Date.now() });
      saveHistory();
    } catch (e) {
      _state.history.push({
        role: 'assistant',
        content: 'Error: ' + (e.message || 'Unknown error') + '. Check your AI API key in Strategy → AI Settings.',
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
    var fab = document.getElementById('chatWidgetFab');
    var panel = document.getElementById('chatWidgetPanel');
    var input = document.getElementById('chatWidgetInput');
    var sendBtn = document.getElementById('chatWidgetSend');
    var clearBtn = document.getElementById('chatWidgetClear');
    var closeBtn = document.getElementById('chatWidgetClose');

    if (fab) {
      fab.addEventListener('click', function () {
        _state.open = !_state.open;
        if (panel) panel.classList.toggle('cw-open', _state.open);
        if (fab) fab.classList.toggle('cw-active', _state.open);
        if (_state.open && input)
          setTimeout(function () {
            input.focus();
          }, 200);
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
        if (panel) panel.classList.remove('cw-open');
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
      if (qb) sendMessage(qb.getAttribute('data-q'));
    });
  }

  PluginRegistry.register('ai-chat-widget', {
    id: 'ai-chat-widget',
    name: 'AI Chat Widget',
    version: '1.0.0',
    dependencies: [],

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

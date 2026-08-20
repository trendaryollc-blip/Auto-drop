/* ===================================================================
   AI COACH — Dedicated Strategy & Learning Page
   =================================================================== */

(function() {
  'use strict';

  const { EventBus, PluginRegistry, UI, Config } = window.HuntDrop;

  PluginRegistry.register('ai-coach', {
    id: 'ai-coach',
    name: 'AI Coach',
    version: '1.0.0',
    dependencies: [],

    init(ctx) {
      this.chatHistory = [];
      this.selectedTopic = null;
    },

    mount(ctx) {
      this.render();
      this.bindEvents();
    },

    unmount(ctx) {},

    render() {
      const container = document.getElementById('sections-container');
      if (!container) return;

      const section = document.createElement('section');
      section.className = 'section';
      section.id = 'section-ai-coach';
      section.innerHTML = `
        <div class="unified-page">
          <div class="unified-breadcrumb">
            <a href="#" onclick="event.preventDefault(); window.HuntDrop.Router.navigate('dashboard');">Dashboard</a>
            <span class="separator">/</span>
            <span class="current">AI Coach</span>
          </div>

          <div class="unified-page-header">
            <h1 class="unified-page-title">
              <span class="page-icon">🧠</span>
              AI Business Coach
            </h1>
          </div>

          <!-- Coach Hero -->
          <div class="ac-hero">
            <div class="ac-hero-content">
              <div class="ac-hero-avatar">🤖</div>
              <div>
                <h2 class="ac-hero-title">Your Personal Dropshipping Mentor</h2>
                <p class="ac-hero-desc">Get personalized advice on products, pricing, marketing, and scaling your business. Ask anything — I'm here to help.</p>
              </div>
            </div>
          </div>

          <!-- Quick Topics -->
          <div class="unified-section">
            <div class="unified-section-header">
              <h2 class="unified-section-title">
                <span class="section-icon icon-cyan">🎯</span>
                What do you need help with?
              </h2>
            </div>
            <div class="ac-topics-grid">
              <button class="ac-topic-card" data-topic="product-research">
                <span class="ac-topic-icon">🔍</span>
                <span class="ac-topic-name">Product Research</span>
                <span class="ac-topic-desc">Find winning products</span>
              </button>
              <button class="ac-topic-card" data-topic="pricing">
                <span class="ac-topic-icon">💰</span>
                <span class="ac-topic-name">Pricing Strategy</span>
                <span class="ac-topic-desc">Set the perfect price</span>
              </button>
              <button class="ac-topic-card" data-topic="marketing">
                <span class="ac-topic-icon">📢</span>
                <span class="ac-topic-name">Marketing</span>
                <span class="ac-topic-desc">Ads & promotion tips</span>
              </button>
              <button class="ac-topic-card" data-topic="scaling">
                <span class="ac-topic-icon">📈</span>
                <span class="ac-topic-name">Scaling</span>
                <span class="ac-topic-desc">Grow your business</span>
              </button>
              <button class="ac-topic-card" data-topic="suppliers">
                <span class="ac-topic-icon">🏭</span>
                <span class="ac-topic-name">Supplier Relations</span>
                <span class="ac-topic-desc">Work with suppliers</span>
              </button>
              <button class="ac-topic-card" data-topic="store">
                <span class="ac-topic-icon">🏪</span>
                <span class="ac-topic-name">Store Optimization</span>
                <span class="ac-topic-desc">Boost conversions</span>
              </button>
            </div>
          </div>

          <!-- Chat Section -->
          <div class="unified-section">
            <div class="unified-section-header">
              <h2 class="unified-section-title">
                <span class="section-icon icon-purple">💬</span>
                Chat with AI Coach
              </h2>
            </div>
            <div class="ac-chat-container">
              <div class="ac-chat-messages" id="acChatMessages">
                <div class="ac-message ai">
                  <div class="ac-msg-avatar">🤖</div>
                  <div class="ac-msg-content">
                    <div class="ac-msg-bubble">
                      Hi! I'm your AI business coach. I can help you with product selection, pricing strategies, marketing tips, and scaling your dropshipping business. What would you like to know?
                    </div>
                    <div class="ac-msg-time">Just now</div>
                  </div>
                </div>
              </div>
              <div class="ac-chat-input">
                <input type="text" id="acChatInput" placeholder="Ask me anything about dropshipping..." />
                <button class="unified-btn unified-btn-primary" id="acSendBtn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Trending Now -->
          <div class="unified-section">
            <div class="unified-section-header">
              <h2 class="unified-section-title">
                <span class="section-icon icon-green">🔥</span>
                Trending Now
              </h2>
            </div>
            <div class="ac-trending-grid" id="acTrendingGrid"></div>
          </div>

          <!-- Learning Center -->
          <div class="unified-section">
            <div class="unified-section-header">
              <h2 class="unified-section-title">
                <span class="section-icon icon-orange">📚</span>
                Learning Center
              </h2>
            </div>
            <div class="ac-learning-grid" id="acLearningGrid"></div>
          </div>

          <!-- Personalized Recommendations -->
          <div class="unified-section">
            <div class="unified-section-header">
              <h2 class="unified-section-title">
                <span class="section-icon icon-purple">✨</span>
                Personalized for You
              </h2>
            </div>
            <div class="ac-recommendations" id="acRecommendations"></div>
          </div>
        </div>
      `;

      container.appendChild(section);
    },

    bindEvents() {
      const sendBtn = document.getElementById('acSendBtn');
      const chatInput = document.getElementById('acChatInput');

      if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
      if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') this.sendMessage();
        });
      }

      document.querySelectorAll('.ac-topic-card').forEach(card => {
        card.addEventListener('click', () => {
          const topic = card.dataset.topic;
          this.askAboutTopic(topic);
        });
      });

      this.loadTrending();
      this.loadLearningCenter();
      this.loadRecommendations();
    },

    sendMessage() {
      const input = document.getElementById('acChatInput');
      const messages = document.getElementById('acChatMessages');
      if (!input || !messages) return;

      const text = input.value.trim();
      if (!text) return;

      // Add user message
      this.addMessage(text, 'user');
      input.value = '';

      // Show typing
      const typing = document.createElement('div');
      typing.className = 'ac-message ai';
      typing.id = 'acTyping';
      typing.innerHTML = `
        <div class="ac-msg-avatar">🤖</div>
        <div class="ac-msg-content">
          <div class="ac-msg-bubble">
            <div class="ai-widget-typing"><span></span><span></span><span></span></div>
          </div>
        </div>
      `;
      messages.appendChild(typing);
      messages.scrollTop = messages.scrollHeight;

      // Simulate response
      setTimeout(() => {
        typing.remove();
        const response = this.generateResponse(text);
        this.addMessage(response, 'ai');
      }, 1500);
    },

    addMessage(text, type) {
      const messages = document.getElementById('acChatMessages');
      if (!messages) return;

      const msg = document.createElement('div');
      msg.className = `ac-message ${type}`;
      msg.innerHTML = `
        <div class="ac-msg-avatar">${type === 'ai' ? '🤖' : '👤'}</div>
        <div class="ac-msg-content">
          <div class="ac-msg-bubble">${text}</div>
          <div class="ac-msg-time">Just now</div>
        </div>
      `;
      messages.appendChild(msg);
      messages.scrollTop = messages.scrollHeight;
    },

    askAboutTopic(topic) {
      const topicQuestions = {
        'product-research': 'What are the best strategies for finding winning products?',
        'pricing': 'How should I price my products for maximum profit?',
        'marketing': 'What are the most effective marketing strategies for dropshipping?',
        'scaling': 'How do I scale my dropshipping business from $1K to $10K/month?',
        'suppliers': 'How do I find and work with reliable suppliers?',
        'store': 'How do I optimize my store for better conversions?'
      };

      const input = document.getElementById('acChatInput');
      if (input) {
        input.value = topicQuestions[topic] || 'Tell me more about this topic';
        this.sendMessage();
      }
    },

    generateResponse(query) {
      const lower = query.toLowerCase();

      if (lower.includes('product') || lower.includes('find') || lower.includes('winning')) {
        return `<strong>Finding Winning Products:</strong><br/><br/>
        1. <strong>Solve a problem</strong> — Products that fix real issues sell best<br/>
        2. <strong>Check the trend</strong> — Use Google Trends and social media<br/>
        3. <strong>Look for 3x markup</strong> — If it costs $10, you should sell for $30+<br/>
        4. <strong>Low competition</strong> — Avoid saturated markets<br/>
        5. <strong>Lightweight</strong> — Easier to ship = lower costs<br/><br/>
        <em>Try our Product Finder tool to search across 10 platforms!</em>`;
      }

      if (lower.includes('pric') || lower.includes('margin') || lower.includes('profit')) {
        return `<strong>Pricing Strategy:</strong><br/><br/>
        1. <strong>Cost-plus pricing</strong> — Add 3x your total cost<br/>
        2. <strong>Value-based pricing</strong> — Price based on perceived value<br/>
        3. <strong>Psychological pricing</strong> — Use $X.99 instead of round numbers<br/>
        4. <strong>Test different prices</strong> — A/B test to find the sweet spot<br/><br/>
        <em>Use our Profit Hub to calculate exact margins!</em>`;
      }

      if (lower.includes('market') || lower.includes('ad') || lower.includes('promot')) {
        return `<strong>Marketing Strategies:</strong><br/><br/>
        1. <strong>TikTok Ads</strong> — Short, authentic videos work best<br/>
        2. <strong>Facebook Retargeting</strong> — Target people who visited but didn't buy<br/>
        3. <strong>Instagram Reels</strong> — Visual products thrive here<br/>
        4. <strong>Content Marketing</strong> — Create valuable content around your niche<br/><br/>
        <em>Check out Marketing Hub for ad copy templates!</em>`;
      }

      if (lower.includes('scal') || lower.includes('grow') || lower.includes('revenue')) {
        return `<strong>Scaling Your Business:</strong><br/><br/>
        1. <strong>Automate</strong> — Use tools for order processing and customer service<br/>
        2. <strong>Diversify</strong> — Don't rely on one product or platform<br/>
        3. <strong>Build an email list</strong> — Repeat customers are cheaper to acquire<br/>
        4. <strong>Optimize ads</strong> — Focus on ROAS, not just traffic<br/>
        5. <strong>Outsource</strong> — Hire help for repetitive tasks<br/><br/>
        <em>Aim for 20-30% profit margin before scaling.</em>`;
      }

      if (lower.includes('supplier') || lower.includes('source')) {
        return `<strong>Working with Suppliers:</strong><br/><br/>
        1. <strong>Always order samples</strong> — Test quality before selling<br/>
        2. <strong>Check reviews</strong> — Look for 4.5+ ratings<br/>
        3. <strong>Communicate clearly</strong> — Set expectations for shipping times<br/>
        4. <strong>Have backups</strong> — Always have 2-3 alternative suppliers<br/>
        5. <strong>Negotiate</strong> — Better prices come with volume<br/><br/>
        <em>Use Supplier Center to compare verified suppliers!</em>`;
      }

      if (lower.includes('store') || lower.includes('conver') || lower.includes('optim')) {
        return `<strong>Store Optimization:</strong><br/><br/>
        1. <strong>Fast loading</strong> — Under 3 seconds or lose customers<br/>
        2. <strong>Mobile-first</strong> — 70%+ traffic is mobile<br/>
        3. <strong>Trust signals</strong> — Reviews, guarantees, secure checkout<br/>
        4. <strong>Clear CTA</strong> — Make it obvious what to do next<br/>
        5. <strong>Social proof</strong> — Show real customer photos and reviews<br/><br/>
        <em>Use Store Builder to audit and improve your store!</em>`;
      }

      return `Great question! Here's my advice:<br/><br/>
      
      The key to success in dropshipping is:<br/>
      1. <strong>Research thoroughly</strong> before committing to a product<br/>
      2. <strong>Test small</strong> — Start with $20-50/day ad budget<br/>
      3. <strong>Track everything</strong> — Know your numbers<br/>
      4. <strong>Iterate fast</strong> — Drop losers, double down on winners<br/>
      5. <strong>Stay consistent</strong> — Success takes time<br/><br/>
      
      What specific area would you like to dive deeper into?`;
    },

    loadTrending() {
      const grid = document.getElementById('acTrendingGrid');
      if (!grid) return;

      const trends = [
        { name: 'Wireless Earbuds', change: '+340%', icon: '🎧', hot: true },
        { name: 'Posture Corrector', change: '+180%', icon: '🧘', hot: true },
        { name: 'LED Strip Lights', change: '+120%', icon: '💡', hot: false },
        { name: 'Portable Blender', change: '+95%', icon: '🥤', hot: false },
        { name: 'Car Phone Mount', change: '+88%', icon: '📱', hot: false }
      ];

      grid.innerHTML = trends.map((t, i) => `
        <div class="ac-trending-card" style="animation: fadeUp 0.4s ease ${i * 0.08}s both;">
          <span class="ac-trending-icon">${t.icon}</span>
          <div class="ac-trending-info">
            <span class="ac-trending-name">${t.name}</span>
            <span class="ac-trending-change ${t.hot ? 'hot' : ''}">${t.change}</span>
          </div>
          ${t.hot ? '<span class="ac-trending-badge">🔥 Hot</span>' : ''}
        </div>
      `).join('');
    },

    loadLearningCenter() {
      const grid = document.getElementById('acLearningGrid');
      if (!grid) return;

      const articles = [
        { title: 'Beginner\'s Guide to Dropshipping', category: 'Getting Started', readTime: '8 min', icon: '📖' },
        { title: 'How to Find Winning Products', category: 'Product Research', readTime: '12 min', icon: '🔍' },
        { title: 'Facebook Ads Mastery', category: 'Marketing', readTime: '15 min', icon: '📢' },
        { title: 'Pricing Psychology 101', category: 'Strategy', readTime: '10 min', icon: '💰' },
        { title: 'Supplier Negotiation Tips', category: 'Sourcing', readTime: '7 min', icon: '🤝' },
        { title: 'Scaling to $10K/Month', category: 'Growth', readTime: '11 min', icon: '📈' }
      ];

      grid.innerHTML = articles.map((a, i) => `
        <div class="ac-learning-card" style="animation: fadeUp 0.4s ease ${i * 0.08}s both;">
          <span class="ac-learning-icon">${a.icon}</span>
          <div class="ac-learning-info">
            <span class="ac-learning-category">${a.category}</span>
            <h4 class="ac-learning-title">${a.title}</h4>
            <span class="ac-learning-time">${a.readTime} read</span>
          </div>
        </div>
      `).join('');
    },

    loadRecommendations() {
      const container = document.getElementById('acRecommendations');
      if (!container) return;

      const recs = [
        { title: 'Optimize your product descriptions', priority: 'high', icon: '✍️' },
        { title: 'Add customer reviews to your store', priority: 'high', icon: '⭐' },
        { title: 'Set up email abandoned cart recovery', priority: 'medium', icon: '📧' },
        { title: 'Test new ad creatives this week', priority: 'medium', icon: '🎨' }
      ];

      container.innerHTML = recs.map((r, i) => `
        <div class="ac-rec-card" style="animation: fadeUp 0.4s ease ${i * 0.1}s both;">
          <span class="ac-rec-icon">${r.icon}</span>
          <span class="ac-rec-title">${r.title}</span>
          <span class="unified-tag ${r.priority === 'high' ? 'red' : 'yellow'}">${r.priority}</span>
        </div>
      `).join('');
    }
  });

})();
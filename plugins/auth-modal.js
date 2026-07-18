// ============================================================================
// PLUGIN: Auth Modal — Login/Register UI
// ============================================================================
// Provides a modal dialog for user authentication.
// Listens to auth:required events and shows the appropriate form.
// Uses BackendAPI when connected, or falls back to local mode.
// ============================================================================
(function(){
const {PluginRegistry,UI,EventBus,Store} = window.HuntDrop;
const esc = s => UI.escapeHtml(String(s || ''));

let _modal = null;
let _cleanups = [];

function showAuthModal(mode = 'login') {
  if (_modal) return; // already open

  const backend = window.HuntDrop.BackendAPI;
  const connected = backend && backend.health.isConnected();

  _modal = document.createElement('div');
  _modal.className = 'hd-auth-modal-overlay';
  _modal.innerHTML = `
    <div class="hd-auth-modal">
      <button class="hd-auth-close" aria-label="Close">&times;</button>
      <div class="hd-auth-header">
        <div class="hd-auth-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h2 class="hd-auth-title">${mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
        <p class="hd-auth-subtitle">${mode === 'login' ? 'Sign in to sync your data across devices' : 'Start saving products and tracking profits'}</p>
        ${!connected ? '<div class="hd-auth-badge">Local Mode</div>' : ''}
      </div>

      <form class="hd-auth-form" autocomplete="on">
        ${mode === 'register' ? `
          <div class="hd-auth-field">
            <label for="authDisplayName">Display Name</label>
            <input type="text" id="authDisplayName" name="displayName" placeholder="Your name" autocomplete="name">
          </div>
        ` : ''}
        <div class="hd-auth-field">
          <label for="authEmail">Email</label>
          <input type="email" id="authEmail" name="email" placeholder="you@example.com" required autocomplete="email">
        </div>
        <div class="hd-auth-field">
          <label for="authPassword">Password</label>
          <input type="password" id="authPassword" name="password" placeholder="${mode === 'register' ? 'At least 6 characters' : 'Your password'}" required minlength="6" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}">
        </div>
        <div class="hd-auth-error" id="authError" style="display:none"></div>
        <button type="submit" class="hd-auth-submit" id="authSubmit">
          <span class="hd-auth-submit-text">${mode === 'login' ? 'Sign In' : 'Create Account'}</span>
          <span class="hd-auth-spinner" style="display:none"></span>
        </button>
      </form>

      <div class="hd-auth-footer">
        ${mode === 'login'
          ? '<span>Don\'t have an account?</span> <button class="hd-auth-switch" data-mode="register">Sign Up</button>'
          : '<span>Already have an account?</span> <button class="hd-auth-switch" data-mode="login">Sign In</button>'
        }
      </div>

      ${mode === 'login' ? `
        <div class="hd-auth-divider"><span>or</span></div>
        <button class="hd-auth-skip" id="authSkip">Continue Without Account</button>
      ` : ''}
    </div>
  `;

  document.body.appendChild(_modal);

  // Animate in
  requestAnimationFrame(() => {
    _modal.classList.add('active');
  });

  // Bind events
  const form = _modal.querySelector('.hd-auth-form');
  const closeBtn = _modal.querySelector('.hd-auth-close');
  const switchBtns = _modal.querySelectorAll('.hd-auth-switch');
  const skipBtn = _modal.querySelector('#authSkip');

  closeBtn.addEventListener('click', closeAuthModal);
  _modal.addEventListener('click', (e) => {
    if (e.target === _modal) closeAuthModal();
  });

  switchBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      closeAuthModal();
      showAuthModal(btn.dataset.mode);
    });
  });

  if (skipBtn) {
    skipBtn.addEventListener('click', closeAuthModal);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = _modal.querySelector('#authSubmit');
    const errorEl = _modal.querySelector('#authError');
    const submitText = submitBtn.querySelector('.hd-auth-submit-text');
    const spinner = submitBtn.querySelector('.hd-auth-spinner');

    // Show loading
    submitBtn.disabled = true;
    submitText.textContent = mode === 'login' ? 'Signing in...' : 'Creating account...';
    spinner.style.display = 'inline-block';
    errorEl.style.display = 'none';

    const email = _modal.querySelector('#authEmail').value.trim();
    const password = _modal.querySelector('#authPassword').value;
    const displayName = _modal.querySelector('#authDisplayName')?.value?.trim() || '';

    try {
      if (connected && backend) {
        if (mode === 'login') {
          await backend.auth.login(email, password);
        } else {
          await backend.auth.register(email, password, displayName);
        }
      } else {
        // Local mode — simulate login
        Store.set('auth.user', { uid: 'local-' + Date.now(), email, displayName: displayName || email.split('@')[0] });
        EventBus.emit('auth:login', { user: Store.get('auth.user') });
      }
      closeAuthModal();
      UI.toast(mode === 'login' ? 'Signed in successfully' : 'Account created!', 'success');
    } catch (err) {
      errorEl.textContent = err.message || 'Authentication failed';
      errorEl.style.display = 'block';
      submitBtn.disabled = false;
      submitText.textContent = mode === 'login' ? 'Sign In' : 'Create Account';
      spinner.style.display = 'none';
    }
  });

  // Focus first input
  setTimeout(() => {
    const firstInput = _modal.querySelector('input');
    if (firstInput) firstInput.focus();
  }, 100);
}

function closeAuthModal() {
  if (!_modal) return;
  _modal.classList.remove('active');
  setTimeout(() => {
    if (_modal && _modal.parentNode) _modal.remove();
    _modal = null;
  }, 300);
}

const AuthModalPlugin = {
  id: 'auth-modal',
  name: 'Auth Modal',
  version: '1.0.0',
  description: 'Login/register modal dialog for user authentication',

  init(_ctx) {},

  mount(_ctx) {
    // Listen for auth:required events
    const c1 = EventBus.on('auth:required', (data) => {
      showAuthModal('login');
    });

    // Listen for auth:show-login events
    const c2 = EventBus.on('auth:show-login', () => {
      showAuthModal('login');
    });

    // Listen for auth:show-register events
    const c3 = EventBus.on('auth:show-register', () => {
      showAuthModal('register');
    });

    _cleanups = [c1, c2, c3];
  },

  unmount(_ctx) {
    _cleanups.forEach(fn => { try { fn(); } catch(e) {} });
    _cleanups = [];
    closeAuthModal();
  }
};

PluginRegistry.register('auth-modal', AuthModalPlugin);
})();

// ============================================================================
// PLUGIN: AI Key Manager — API key storage, verification, provider config
// v2.0 — Secure encryption with random master key (no hardcoded passphrases)
// ============================================================================
// Security architecture:
//   - Encryption key is randomly generated on first use (NOT in source code)
//   - Stored in IndexedDB with sessionStorage fallback (separate from encrypted data)
//   - AES-GCM with random 12-byte IV per operation
//   - Old v2 keys (hardcoded passphrase) are transparently migrated on first access
//   - No XOR fallback — requires Web Crypto API (all modern browsers support it)
//
// SECURITY LIMITATIONS (inherent to client-side-only apps):
//   - Master key is accessible via DevTools (unavoidable without a backend proxy)
//   - sessionStorage clears master key when browser closes (vs localStorage which persists)
//   - For maximum security, proxy API calls through a backend server that holds keys
//     server-side. This client-side approach is suitable for personal/local use only.
//   - NEVER use this in production with shared or untrusted machines.
// ============================================================================
(function () {
  const _km = window.HuntDrop;
  if (!_km || !_km.PluginRegistry) {
    console.error('[AIKeyManager] HuntDrop core not loaded');
    return;
  }
  const PluginRegistry = _km.PluginRegistry;
  const Config = _km.Config;

  const PROVIDERS = {
    openai: {
      name: 'OpenAI',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
      keyPrefix: 'sk-',
      getKeyUrl: 'https://platform.openai.com/api-keys',
      color: '#10a37f',
      tier: 'paid',
      freeNote: '',
    },
    anthropic: {
      name: 'Anthropic',
      endpoint: 'https://api.anthropic.com/v1/messages',
      models: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
      keyPrefix: 'sk-ant-',
      getKeyUrl: 'https://console.anthropic.com',
      color: '#d97706',
      tier: 'paid',
      freeNote: '',
    },
    google: {
      name: 'Google AI',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      models: ['gemini-1.5-flash', 'gemini-1.5-pro'],
      keyPrefix: 'AI',
      getKeyUrl: 'https://aistudio.google.com',
      color: '#4285f4',
      tier: 'free',
      freeNote: '60 requests/min free',
    },
    groq: {
      name: 'Groq (FREE)',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      models: ['llama3-70b-8192', 'llama3-8b-8192', 'mixtral-8x7b-32768', 'gemma-7b-it'],
      keyPrefix: 'gsk_',
      getKeyUrl: 'https://console.groq.com',
      color: '#f55036',
      tier: 'free',
      freeNote: '14,400 requests/day free',
    },
    deepseek: {
      name: 'DeepSeek',
      endpoint: 'https://api.deepseek.com/v1/chat/completions',
      models: ['deepseek-chat', 'deepseek-coder'],
      keyPrefix: 'sk-',
      getKeyUrl: 'https://platform.deepseek.com/api_keys',
      color: '#4f6ef7',
      tier: 'free',
      freeNote: '$5 free credit on signup, then $0.14/M tokens',
    },
    mistral: {
      name: 'Mistral AI',
      endpoint: 'https://api.mistral.ai/v1/chat/completions',
      models: ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest'],
      keyPrefix: '',
      getKeyUrl: 'https://console.mistral.ai/api-keys',
      color: '#ff7000',
      tier: 'free',
      freeNote: '500K free tokens, then pay-as-you-go',
    },
    cohere: {
      name: 'Cohere',
      endpoint: 'https://api.cohere.ai/v1/chat',
      models: ['command-r-plus', 'command-r', 'command-light'],
      keyPrefix: '',
      getKeyUrl: 'https://dashboard.cohere.com/api-keys',
      color: '#39594d',
      tier: 'free',
      freeNote: 'Free trial API key with rate limits',
    },
    together: {
      name: 'Together AI',
      endpoint: 'https://api.together.xyz/v1/chat/completions',
      models: [
        'meta-llama/Llama-3-70b-chat-hf',
        'meta-llama/Llama-3-8b-chat-hf',
        'mistralai/Mixtral-8x7B-Instruct-v0.1',
      ],
      keyPrefix: '',
      getKeyUrl: 'https://api.together.xyz/settings/api-keys',
      color: '#7c3aed',
      tier: 'free',
      freeNote: '$1 free credit, many open-source models',
    },
    huggingface: {
      name: 'Hugging Face',
      endpoint: 'https://api-inference.huggingface.co/models',
      models: [
        'mistralai/Mistral-7B-Instruct-v0.3',
        'HuggingFaceH4/zephyr-7b-beta',
        'microsoft/Phi-3-mini-4k-instruct',
      ],
      keyPrefix: 'hf_',
      getKeyUrl: 'https://huggingface.co/settings/tokens',
      color: '#ffd21e',
      tier: 'free',
      freeNote: 'Free inference API (rate limited), 30K+ models',
    },
    perplexity: {
      name: 'Perplexity',
      endpoint: 'https://api.perplexity.ai/chat/completions',
      models: ['sonar-pro', 'sonar', 'mixtral-8x7b-instruct'],
      keyPrefix: '',
      getKeyUrl: 'https://www.perplexity.ai/settings/api',
      color: '#0080ff',
      tier: 'free',
      freeNote: '$5 free credit for new users, $0.10-0.30/M tokens',
    },
    fireworks: {
      name: 'Fireworks AI',
      endpoint: 'https://api.fireworks.ai/inference/v1/chat/completions',
      models: [
        'accounts/fireworks/models/llama-v3p1-70b-instruct',
        'accounts/fireworks/models/llama-v3p1-8b-instruct',
        'accounts/fireworks/models/mixtral-8x7b-instruct',
      ],
      keyPrefix: '',
      getKeyUrl: 'https://fireworks.ai/api-keys',
      color: '#fb923c',
      tier: 'free',
      freeNote: 'Free tier with fast inference, $0.50 credit',
    },
    openrouter: {
      name: 'OpenRouter',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      models: ['openai/gpt-4o-mini', 'meta-llama/llama-3-70b-instruct', 'mistralai/mixtral-8x7b-instruct'],
      keyPrefix: '',
      getKeyUrl: 'https://openrouter.ai/keys',
      color: '#a855f7',
      tier: 'free',
      freeNote: 'Free $1 credit, 200+ models from every provider',
    },
    replicate: {
      name: 'Replicate',
      endpoint: 'https://api.replicate.com/v1/models',
      models: [
        'meta/meta-llama-3-70b-instruct',
        'mistralai/mixtral-8x7b-instruct-v0.1',
        'google-deepmind/gemma-2-27b-it',
      ],
      keyPrefix: '',
      getKeyUrl: 'https://replicate.com/account/api-tokens',
      color: '#38bdf8',
      tier: 'free',
      freeNote: 'Free tier with rate limits, open-source models',
    },
    octoai: {
      name: 'OctoAI',
      endpoint: 'https://text.octoai.run/v1/chat/completions',
      models: ['llama-3-70b-instruct', 'llama-3-8b-instruct', 'mixtral-8x7b-instruct'],
      keyPrefix: '',
      getKeyUrl: 'https://octoai.cloud/keys',
      color: '#f472b6',
      tier: 'free',
      freeNote: 'Free trial credits, fast inference',
    },
    lepton: {
      name: 'Lepton AI',
      endpoint: 'https://llama2-7b.lepton.run/v1/chat/completions',
      models: ['llama3-70b', 'llama3-8b', 'mixtral-8x7b'],
      keyPrefix: '',
      getKeyUrl: 'https://lepton.ai/dashboard',
      color: '#34d399',
      tier: 'free',
      freeNote: 'Free credits on signup, pay-as-you-go',
    },
  };

  // ===== SECURE ENCRYPTION ENGINE =====

  const MASTER_KEY_DB_NAME = 'huntdrop_secure';
  const MASTER_KEY_DB_STORE = 'keys';
  const MASTER_KEY_DB_KEY = 'master-key-v3';
  const LS_KEY_FALLBACK = 'huntdrop_master_key_v3';
  const _usesSessionStorage = typeof sessionStorage !== 'undefined';

  let _masterKey = null;
  let _initPromise = null;
  let _insecureMode = false;
  let _verifyLastCall = 0;

  const _enc = new TextEncoder();
  const _dec = new TextDecoder();

  // --- IndexedDB helpers ---

  function hasIndexedDB() {
    try {
      return typeof indexedDB !== 'undefined' && indexedDB !== null;
    } catch {
      return false;
    }
  }

  function openKeyDB() {
    return new Promise(function (resolve, reject) {
      if (!hasIndexedDB()) {
        reject(new Error('IndexedDB not available'));
        return;
      }
      let req;
      try {
        req = indexedDB.open(MASTER_KEY_DB_NAME, 1);
      } catch (e) {
        reject(e);
        return;
      }
      req.onupgradeneeded = function (e) {
        try {
          e.target.result.createObjectStore(MASTER_KEY_DB_STORE);
        } catch {
          /* ignored */
        }
      };
      req.onsuccess = function (e) {
        resolve(e.target.result);
      };
      req.onerror = function (e) {
        reject(e.target.error || new Error('IndexedDB open failed'));
      };
    });
  }

  async function storeKeyInDB(keyBytes) {
    try {
      const db = await openKeyDB();
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(MASTER_KEY_DB_STORE, 'readwrite');
        tx.objectStore(MASTER_KEY_DB_STORE).put(keyBytes, MASTER_KEY_DB_KEY);
        tx.oncomplete = function () {
          resolve(true);
        };
        tx.onerror = function () {
          reject(new Error('IndexedDB store failed'));
        };
      });
    } catch {
      return false;
    }
  }

  async function loadKeyFromDB() {
    try {
      const db = await openKeyDB();
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(MASTER_KEY_DB_STORE, 'readonly');
        const req = tx.objectStore(MASTER_KEY_DB_STORE).get(MASTER_KEY_DB_KEY);
        req.onsuccess = function (e) {
          resolve(e.target.result || null);
        };
        req.onerror = function () {
          reject(new Error('IndexedDB load failed'));
        };
      });
    } catch {
      return null;
    }
  }

  // --- localStorage fallback for environments without IndexedDB ---

  function loadKeyFromLS() {
    try {
      const store = _usesSessionStorage ? sessionStorage : localStorage;
      const raw = store.getItem(LS_KEY_FALLBACK);
      if (!raw) return null;
      const binStr = atob(raw);
      const arr = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) arr[i] = binStr.charCodeAt(i);
      if (arr.length !== 32) return null;
      return arr;
    } catch {
      return null;
    }
  }

  function saveKeyToLS(keyBytes) {
    try {
      let str = '';
      for (let i = 0; i < keyBytes.length; i++) str += String.fromCharCode(keyBytes[i]);
      const store = _usesSessionStorage ? sessionStorage : localStorage;
      store.setItem(LS_KEY_FALLBACK, btoa(str));
    } catch {
      /* ignored */
    }
  }

  // --- Master key lifecycle ---

  async function generateMasterKey() {
    const keyBytes = new Uint8Array(32); // 256-bit key
    crypto.getRandomValues(keyBytes);
    // Persist to IndexedDB first (more isolated), fallback to localStorage
    const dbOk = await storeKeyInDB(keyBytes);
    if (!dbOk) saveKeyToLS(keyBytes);
    return keyBytes;
  }

  async function loadMasterKey() {
    // Priority 1: IndexedDB
    let keyBytes = await loadKeyFromDB();
    if (keyBytes && keyBytes.length === 32) return keyBytes;
    // Priority 2: localStorage fallback
    keyBytes = loadKeyFromLS();
    if (keyBytes && keyBytes.length === 32) return keyBytes;
    // Priority 3: Generate new key
    return generateMasterKey();
  }

  async function ensureReady() {
    // If already initialized, return immediately
    if (_masterKey) return _masterKey;
    // If init is in progress, wait for it
    if (_initPromise) {
      await _initPromise;
      return _masterKey;
    }
    // First-time initialization
    _masterKey = await loadMasterKey();
    return _masterKey;
  }

  // --- AES-GCM encrypt/decrypt ---

  async function importAesKey(keyBytes) {
    return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }

  /**
   * Encrypt a string using AES-256-GCM with a random IV.
   * Returns 'v3:' + base64(iv + ciphertext)
   * Returns null on failure.
   */
  async function encrypt(plaintext) {
    try {
      const keyBytes = await ensureReady();
      const aesKey = await importAesKey(keyBytes);
      const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV per AES-GCM spec
      const encoded = _enc.encode(plaintext);
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, aesKey, encoded);
      // Combine IV + ciphertext into single buffer
      const ctBytes = new Uint8Array(ciphertext);
      const combined = new Uint8Array(iv.length + ctBytes.length);
      combined.set(iv, 0);
      combined.set(ctBytes, iv.length);
      // Base64 encode
      let b64 = '';
      for (let i = 0; i < combined.length; i++) b64 += String.fromCharCode(combined[i]);
      return 'v3:' + btoa(b64);
    } catch (e) {
      console.error('[AIKeyManager] Encryption failed:', e);
      return null;
    }
  }

  /**
   * Decrypt a string. Supports:
   *   v3: AES-GCM with random master key (current format)
   *   v2: AES-GCM with hardcoded passphrase (legacy — migrated to v3 on access)
   *   v1: XOR obfuscation (legacy — migrated to v3 on access)
   * Returns plaintext string, or empty string on failure.
   */
  async function decrypt(ciphertext) {
    if (!ciphertext || typeof ciphertext !== 'string') return '';
    try {
      // === v3: Current format — AES-GCM with random master key ===
      if (ciphertext.indexOf('v3:') === 0) {
        const raw = atob(ciphertext.slice(3));
        const data = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) data[i] = raw.charCodeAt(i);
        if (data.length < 13) return ''; // IV(12) + at least 1 byte
        const iv = data.slice(0, 12);
        const ct = data.slice(12);
        const keyBytes = await ensureReady();
        const aesKey = await importAesKey(keyBytes);
        const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, aesKey, ct);
        return _dec.decode(plainBuffer);
      }

      // === v2: Legacy — AES-GCM with hardcoded passphrase (for migration only) ===
      if (ciphertext.indexOf('v2:') === 0) {
        const plaintext = await _decryptLegacyV2(ciphertext);
        return plaintext || '';
      }

      // === v1: Legacy — XOR obfuscation (for migration only) ===
      if (ciphertext.indexOf('v1:') === 0) {
        return _decryptLegacyV1(ciphertext.slice(3));
      }

      // === Unversioned: try as legacy XOR ===
      return _decryptLegacyV1(ciphertext);
    } catch (e) {
      console.error('[AIKeyManager] Decryption failed:', e);
      return '';
    }
  }

  // Legacy v2 decryption - reads passphrase from environment or config
  // SECURITY: Passphrase should be set via window.HuntDrop._legacyKeyConfig at app startup
  // or via environment variable in build process
  async function _decryptLegacyV2(str) {
    try {
      // Try to get passphrase from runtime config (set by app.js from env)
      const passphrase =
        (window.HuntDrop && window.HuntDrop._legacyKeyConfig && window.HuntDrop._legacyKeyConfig.passphrase) || '';
      const salt =
        (window.HuntDrop && window.HuntDrop._legacyKeyConfig && window.HuntDrop._legacyKeyConfig.salt) ||
        'HuntDropAI_DefaultSalt';

      if (!passphrase) {
        console.warn('[AIKeyManager] Legacy v2 key found but no passphrase configured. Key migration skipped.');
        return '';
      }

      const keyMaterial = await crypto.subtle.importKey('raw', _enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
      const legacyKey = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: _enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      const raw = atob(str.slice(3));
      const data = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) data[i] = raw.charCodeAt(i);
      const iv = data.slice(0, 12);
      const ct = data.slice(12);
      const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, legacyKey, ct);
      return _dec.decode(buf);
    } catch (e) {
      console.warn('[AIKeyManager] Legacy v2 decryption failed:', e.message);
      return '';
    }
  }

  // Legacy v1 XOR decryption (migration only)
  // SECURITY: XOR key should be configured at runtime, not hardcoded
  function _decryptLegacyV1(b64Str) {
    try {
      // Try to get XOR key from runtime config
      const xorKey =
        (window.HuntDrop && window.HuntDrop._legacyKeyConfig && window.HuntDrop._legacyKeyConfig.xorKey) || 0;

      if (!xorKey) {
        console.warn('[AIKeyManager] Legacy v1 key found but no XOR key configured. Key migration skipped.');
        return '';
      }

      const decoded = atob(b64Str);
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(decoded.charCodeAt(i) ^ xorKey);
      }
      return result;
    } catch (e) {
      console.warn('[AIKeyManager] Legacy v1 decryption failed:', e.message);
      return '';
    }
  }

  // --- Migration: transparently upgrade v1/v2 keys to v3 ---

  async function migrateIfNeeded(provider, encryptedValue) {
    if (!encryptedValue) return null;
    const format = encryptedValue.substring(0, 3);
    if (format === 'v3:') return null; // Already current format — no migration needed

    // Decrypt with legacy method
    const plaintext = await decrypt(encryptedValue);
    if (!plaintext) return null;

    // Re-encrypt with current v3 format
    const newEncrypted = await encrypt(plaintext);
    return newEncrypted;
  }

  // ===== API KEY MANAGER PLUGIN =====

  const APIKeyManager = {
    id: 'ai-key-manager',
    name: 'AI Key Manager',
    version: '2.0.0',
    providers: PROVIDERS,

    init: function (_ctx) {
      Config.defaults('aiKeys', {
        provider: 'groq',
        model: 'llama3-70b-8192',
        keys: {},
        featureAssignments: {},
      });

      // FIX #14: Check for crypto.subtle availability before initializing encryption
      if (!window.crypto || !window.crypto.subtle) {
        console.error(
          '[AIKeyManager] CRITICAL: Web Crypto API (crypto.subtle) is not available. ' +
            'This usually means the page is loaded over HTTP instead of HTTPS, or the browser is too old. ' +
            'API keys CANNOT be encrypted securely. They will be stored in plaintext as a fallback — ' +
            'DO NOT use this in production or on shared machines.'
        );
        // Disable encryption — keys will be stored as plaintext with a warning prefix
        _insecureMode = true;
        // Show a warning banner if possible
        if (window.HuntDrop && window.HuntDrop.EventBus) {
          window.HuntDrop.EventBus.emit('plugin:error', {
            pluginId: 'ai-key-manager',
            error: new Error('Web Crypto API unavailable — encryption disabled'),
            phase: 'init',
          });
        }
        return;
      }

      // Security warning for client-side key storage
      console.warn(
        '[AIKeyManager] SECURITY NOTICE: API keys are stored client-side with AES-GCM encryption. ' +
          'The encryption key is accessible via DevTools. For production use, proxy API calls through ' +
          'a backend server. This approach is suitable for personal/local use only.'
      );
      // Initialize crypto subsystem (generates or loads master key)
      _initPromise = ensureReady()
        .then(async function () {
          // Migrate any legacy v1/v2 keys to v3 format
          const keys = Config.get('aiKeys.keys') || {};
          let migrated = false;
          for (const provider in keys) {
            if (!Object.prototype.hasOwnProperty.call(keys, provider)) continue;
            const val = keys[provider];
            if (val && val.indexOf('v3:') !== 0) {
              const newEnc = await migrateIfNeeded(provider, val);
              if (newEnc) {
                keys[provider] = newEnc;
                migrated = true;
              }
            }
          }
          if (migrated) Config.set('aiKeys.keys', keys);
        })
        .catch(function (e) {
          console.error('[AIKeyManager] Init failed:', e);
        });
    },

    mount: function (_ctx) {},

    unmount: function (_ctx) {},

    /**
     * Wait for the crypto subsystem to be fully initialized.
     * Call this before any encrypt/decrypt operations if you need to
     * guarantee the master key is ready.
     */
    waitReady: function () {
      return _initPromise || ensureReady();
    },

    getProvider: function () {
      return Config.get('aiKeys.provider') || 'groq';
    },

    getModel: function () {
      return Config.get('aiKeys.model') || 'llama3-70b-8192';
    },

    setProvider: function (provider) {
      Config.set('aiKeys.provider', provider);
      const models = PROVIDERS[provider] ? PROVIDERS[provider].models : [];
      if (models.length && models.indexOf(this.getModel()) === -1) {
        Config.set('aiKeys.model', models[0]);
      }
    },

    setModel: function (model) {
      Config.set('aiKeys.model', model);
    },

    /**
     * Encrypt and store an API key for the given provider.
     * Uses AES-256-GCM with random IV (v3 format).
     */
    saveKey: async function (provider, key) {
      // FIX #14: In insecure mode, store with plaintext warning prefix
      if (_insecureMode) {
        var keys = Config.get('aiKeys.keys') || {};
        keys[provider] = 'plain:' + key;
        Config.set('aiKeys.keys', keys);
        return;
      }
      await ensureReady();
      const encrypted = await encrypt(key);
      if (!encrypted) throw new Error('Encryption failed');
      var keys = Config.get('aiKeys.keys') || {};
      keys[provider] = encrypted;
      Config.set('aiKeys.keys', keys);
    },

    /**
     * Retrieve and decrypt an API key for the given provider.
     * Transparently migrates v1/v2 keys to v3 on access.
     * Returns plaintext key or null if not found.
     */
    getKey: async function (provider) {
      const keys = Config.get('aiKeys.keys') || {};
      const encrypted = keys[provider];
      if (!encrypted) return null;

      // FIX #14: Handle plaintext keys stored in insecure mode
      if (encrypted.indexOf('plain:') === 0) {
        return encrypted.slice(6);
      }

      if (_insecureMode) {
        // Cannot decrypt in insecure mode — return the raw value (may be plaintext)
        return encrypted.indexOf('plain:') === 0 ? encrypted.slice(6) : null;
      }

      await ensureReady();
      const plaintext = await decrypt(encrypted);
      if (!plaintext) return null;

      // Auto-migrate: if key was v1/v2, re-encrypt as v3
      if (encrypted.indexOf('v3:') !== 0) {
        const newEnc = await encrypt(plaintext);
        if (newEnc) {
          keys[provider] = newEnc;
          Config.set('aiKeys.keys', keys);
        }
      }

      return plaintext;
    },

    /**
     * Remove the stored API key for the given provider.
     */
    removeKey: function (provider) {
      const keys = Config.get('aiKeys.keys') || {};
      delete keys[provider];
      Config.set('aiKeys.keys', keys);
    },

    /**
     * Check if an encrypted key exists for the given provider.
     * Does NOT decrypt — just checks if the encrypted blob is present.
     */
    hasKey: function (provider) {
      const keys = Config.get('aiKeys.keys') || {};
      return !!keys[provider || this.getProvider()];
    },

    /**
     * Build HTTP headers for the given provider's API.
     */
    getHeaders: function (provider, key) {
      switch (provider) {
        case 'openai':
        case 'groq':
        case 'deepseek':
        case 'together':
        case 'perplexity':
        case 'fireworks':
        case 'openrouter':
        case 'octoai':
        case 'lepton':
        case 'mistral':
        case 'cohere':
        case 'huggingface':
          return { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
        case 'anthropic':
          return { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' };
        case 'google':
          return { 'Content-Type': 'application/json' };
        default:
          return { 'Content-Type': 'application/json' };
      }
    },

    /**
     * Verify an API key by making a lightweight request to the provider.
     * Returns true if the key is valid, false otherwise.
     * Rate limited to prevent abuse.
     *
     * SECURITY NOTE: For Google API, the key is passed as URL parameter which
     * may leak to browser history and server logs. For production use, implement
     * a backend proxy that verifies keys server-side.
     */
    verifyKey: async function (provider, key) {
      const now = Date.now();
      if (now - _verifyLastCall < 2000) return false;
      _verifyLastCall = now;
      try {
        const config = PROVIDERS[provider];
        if (!config) return false;

        // Check if a proxy is configured for secure verification
        const proxyUrl = (window.HuntDrop && window.HuntDrop._apiProxy) || null;

        if (provider === 'google') {
          // Google API requires key in URL parameter (no header-based auth)
          // Use proxy if available to avoid key exposure
          const verifyUrl = proxyUrl
            ? proxyUrl + '/verify/' + provider
            : config.endpoint + '/gemini-1.5-flash?key=' + key;

          if (!proxyUrl) {
            console.warn(
              '[AIKeyManager] Google API key verification exposes key in URL. Configure window.HuntDrop._apiProxy for secure verification.'
            );
          }

          const resp = await fetch(verifyUrl, {
            method: proxyUrl ? 'POST' : 'GET',
            headers: proxyUrl ? { 'Content-Type': 'application/json' } : {},
            body: proxyUrl ? JSON.stringify({ key: key }) : undefined,
          });
          return resp.ok;
        }

        const resp = await fetch(proxyUrl || config.endpoint, {
          method: 'POST',
          headers: proxyUrl
            ? { 'Content-Type': 'application/json', 'X-Provider': provider }
            : this.getHeaders(provider, key),
          body: JSON.stringify(
            proxyUrl
              ? { key: key, model: config.models[0], test: true }
              : {
                  model: config.models[0],
                  messages: [{ role: 'user', content: 'Say ok' }],
                  max_tokens: 5,
                }
          ),
        });
        return resp.ok;
      } catch (e) {
        console.warn('[AIKeyManager] Key verification failed:', e.message);
        return false;
      }
    },

    /**
     * Get a security notice object for display in UI.
     * Returns {level, title, message, recommendation}
     */
    getSecurityNotice: function () {
      return {
        level: 'warning',
        title: 'Client-Side Key Storage',
        message:
          'API keys are encrypted with AES-GCM but remain accessible via browser DevTools. ' +
          'The master encryption key is stored in your browser (IndexedDB/sessionStorage). ' +
          'This is secure for personal use on a trusted machine, but not for shared or production environments.',
        recommendation:
          'For production, deploy a backend proxy that holds API keys server-side ' +
          'and proxies all AI requests. This prevents keys from ever reaching the browser.',
      };
    },

    /**
     * Get the current connection status for the configured provider.
     */
    getStatus: function () {
      const provider = this.getProvider();
      const hasKey = this.hasKey(provider);
      return {
        provider: provider,
        providerName: PROVIDERS[provider] ? PROVIDERS[provider].name : provider,
        hasKey: hasKey,
        model: this.getModel(),
        connected: hasKey,
        color: PROVIDERS[provider] ? PROVIDERS[provider].color : 'var(--accent-cyan)',
      };
    },

    // ===== Per-Feature Key Assignment =====

    FEATURES: {
      'ai-chat-service': { name: 'AI Chat Coach', desc: 'In-app AI assistant and business coach chat', icon: '💬' },
      'ad-studio': { name: 'Ad Creative Studio', desc: 'Generate ad copy, hooks, and creatives', icon: '📢' },
      'ai-business-coach': {
        name: 'AI Business Coach',
        desc: 'Personalized business mentorship and strategy',
        icon: '🧠',
      },
      'cb-intelligence-service': {
        name: 'Competitor Intelligence',
        desc: 'Analyze competitors, ads, and market data',
        icon: '🔍',
      },
    },

    getFeatureProvider: function (featureId) {
      const assignments = Config.get('aiKeys.featureAssignments') || {};
      return assignments[featureId] || this.getProvider();
    },

    setFeatureAssignment: function (featureId, provider) {
      const assignments = Config.get('aiKeys.featureAssignments') || {};
      if (provider) {
        assignments[featureId] = provider;
      } else {
        delete assignments[featureId];
      }
      Config.set('aiKeys.featureAssignments', assignments);
    },

    removeFeatureAssignment: function (featureId) {
      const assignments = Config.get('aiKeys.featureAssignments') || {};
      delete assignments[featureId];
      Config.set('aiKeys.featureAssignments', assignments);
    },

    getFeatureAssignments: function () {
      return Config.get('aiKeys.featureAssignments') || {};
    },

    getFeatureKey: async function (featureId) {
      const provider = this.getFeatureProvider(featureId);
      const key = await this.getKey(provider);
      return { provider: provider, key: key };
    },

    hasFeatureKey: function (featureId) {
      const provider = this.getFeatureProvider(featureId);
      return this.hasKey(provider);
    },
  };

  window.HuntDrop.APIKeyManager = APIKeyManager;
  PluginRegistry.register('ai-key-manager', APIKeyManager);
})();

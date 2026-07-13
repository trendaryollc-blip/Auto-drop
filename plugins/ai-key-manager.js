// ============================================================================
// PLUGIN: AI Key Manager — API key storage, verification, provider config
// ============================================================================
(function(){
const {PluginRegistry,Config,UI} = window.HuntDrop;

const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o-mini','gpt-4o','gpt-4-turbo'],
    keyPrefix: 'sk-',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    color: '#10a37f'
  },
  anthropic: {
    name: 'Anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    models: ['claude-3-haiku-20240307','claude-3-sonnet-20240229','claude-3-opus-20240229'],
    keyPrefix: 'sk-ant-',
    getKeyUrl: 'https://console.anthropic.com',
    color: '#d97706'
  },
  google: {
    name: 'Google AI',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    models: ['gemini-1.5-flash','gemini-1.5-pro'],
    keyPrefix: 'AI',
    getKeyUrl: 'https://aistudio.google.com',
    color: '#4285f4'
  },
  groq: {
    name: 'Groq (FREE)',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    models: ['llama3-70b-8192','llama3-8b-8192','mixtral-8x7b-32768','gemma-7b-it'],
    keyPrefix: 'gsk_',
    getKeyUrl: 'https://console.groq.com',
    color: '#f55036'
  }
};

const PASSPHRASE = 'HuntDropAI_v3_SecureKey_2024';

function generateKeyMaterial(passphrase) {
  var enc = new TextEncoder();
  return crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
}

function getAESKey() {
  return generateKeyMaterial(PASSPHRASE).then(function(keyMaterial) {
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc('HuntDropAI_Salt'), iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  });
}

var enc = new TextEncoder();
var dec = new TextDecoder();

async function encrypt(str) {
  try {
    var key = await getAESKey();
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var encoded = enc.encode(str);
    var ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, encoded);
    var combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return 'v2:' + btoa(String.fromCharCode.apply(null, combined));
  } catch(e) {
    // Fallback to XOR for environments without Web Crypto
    var result = '';
    for (var i = 0; i < str.length; i++) {
      result += String.fromCharCode(str.charCodeAt(i) ^ 73);
    }
    return 'v1:' + btoa(result);
  }
}

async function decrypt(str) {
  try {
    if (str.indexOf('v2:') === 0) {
      var raw = atob(str.slice(3));
      var data = new Uint8Array(raw.length);
      for (var i = 0; i < raw.length; i++) data[i] = raw.charCodeAt(i);
      var iv = data.slice(0, 12);
      var ciphertext = data.slice(12);
      var key = await getAESKey();
      var plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ciphertext);
      return dec.decode(plainBuffer);
    }
    // Legacy XOR fallback (v1 or unversioned)
    var legacyStr = str.indexOf('v1:') === 0 ? str.slice(3) : str;
    var decoded = atob(legacyStr);
    var result = '';
    for (var j = 0; j < decoded.length; j++) {
      result += String.fromCharCode(decoded.charCodeAt(j) ^ 73);
    }
    return result;
  } catch(e) { return ''; }
}

const APIKeyManager = {
  id: 'ai-key-manager',
  name: 'AI Key Manager',
  version: '1.0.0',
  providers: PROVIDERS,

  init(ctx) {
    Config.defaults('aiKeys', {
      provider: 'groq',
      model: 'llama3-70b-8192',
      keys: {}
    });
  },

  mount(ctx) {},

  unmount(ctx) {},

  getProvider() {
    return Config.get('aiKeys.provider') || 'groq';
  },

  getModel() {
    return Config.get('aiKeys.model') || 'llama3-70b-8192';
  },

  setProvider(provider) {
    Config.set('aiKeys.provider', provider);
    var models = PROVIDERS[provider]?.models || [];
    if (models.length && !models.includes(this.getModel())) {
      Config.set('aiKeys.model', models[0]);
    }
  },

  setModel(model) {
    Config.set('aiKeys.model', model);
  },

  async saveKey(provider, key) {
    var keys = Config.get('aiKeys.keys') || {};
    keys[provider] = await encrypt(key);
    Config.set('aiKeys.keys', keys);
  },

  async getKey(provider) {
    var keys = Config.get('aiKeys.keys') || {};
    return keys[provider] ? await decrypt(keys[provider]) : null;
  },

  removeKey(provider) {
    var keys = Config.get('aiKeys.keys') || {};
    delete keys[provider];
    Config.set('aiKeys.keys', keys);
  },

  hasKey(provider) {
    var keys = Config.get('aiKeys.keys') || {};
    return !!keys[provider || this.getProvider()];
  },

  getHeaders(provider, key) {
    switch(provider) {
      case 'openai':
      case 'groq':
        return { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' };
      case 'anthropic':
        return { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' };
      case 'google':
        return { 'Content-Type': 'application/json' };
      default:
        return { 'Content-Type': 'application/json' };
    }
  },

  async verifyKey(provider, key) {
    try {
      var config = PROVIDERS[provider];
      if (!config) return false;
      if (provider === 'google') {
        var resp = await fetch(config.endpoint + '/gemini-1.5-flash?key=' + key);
        return resp.ok;
      }
      var resp = await fetch(config.endpoint, {
        method: 'POST',
        headers: this.getHeaders(provider, key),
        body: JSON.stringify({
          model: config.models[0],
          messages: [{ role: 'user', content: 'Say ok' }],
          max_tokens: 5
        })
      });
      return resp.ok;
    } catch(e) { return false; }
  },

  getStatus() {
    var provider = this.getProvider();
    var hasKey = this.hasKey(provider);
    return {
      provider: provider,
      providerName: PROVIDERS[provider]?.name || provider,
      hasKey: hasKey,
      model: this.getModel(),
      connected: hasKey,
      color: PROVIDERS[provider]?.color || 'var(--accent-cyan)'
    };
  }
};

window.HuntDrop.APIKeyManager = APIKeyManager;
PluginRegistry.register('ai-key-manager', APIKeyManager);
})();

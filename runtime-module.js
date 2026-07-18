const MODULE_PUBLIC_API = Object.freeze([
  'navigateTo',
  'goBack',
  'renderRelatedTools',
  'showPluginLoading',
  'hidePluginLoading',
  'showErrorBanner',
  'exportCSV',
  'exportJSON',
  'toast',
  'Config',
  'EventBus',
  'PluginRegistry',
  'DataLayer',
  'UI',
  'FeatureFlags',
  'Router',
]);

function createRuntimeModuleApi(runtime = globalThis.window?.HuntDrop) {
  if (!runtime) {
    runtime = {};
  }

  const snapshot = () =>
    MODULE_PUBLIC_API.reduce((acc, key) => {
      acc[key] = runtime[key];
      return acc;
    }, {});

  const api = {
    version: '1.0.0',
    listPublicApi: () => [...MODULE_PUBLIC_API],
    snapshot,
    register(name, value) {
      runtime[name] = value;
      return runtime[name];
    },
    has(name) {
      return Object.prototype.hasOwnProperty.call(runtime, name);
    },
    isReady() {
      return Boolean(runtime?.EventBus && runtime?.PluginRegistry && runtime?.Config);
    },
  };

  runtime.__moduleApi = api;
  runtime.__moduleApiVersion = api.version;
  return api;
}

function registerRuntimeModuleApi(runtime = globalThis.window?.HuntDrop) {
  return createRuntimeModuleApi(runtime);
}

if (typeof window !== 'undefined') {
  window.registerRuntimeModuleApi = registerRuntimeModuleApi;
  // Auto-initialize when loaded as a regular script (replaces the ES module import+call)
  if (window.HuntDrop) {
    registerRuntimeModuleApi(window.HuntDrop);
  }
}

// Load non-critical CSS asynchronously to preserve the inline critical path.
// This avoids blocking render and reduces FOUC while still loading full styles.
var CSS_ASSETS = [
  'css/base.css',
  'css/components.css',
  'css/navigation.css',
  'css/dashboard.css',
  'css/placeholders.css',
  'css/responsive.css',
  'css/search-results.css',
  'css/product-detail.css',
  'css/plugin-coach.css',
  'css/plugin-financial.css',
  'css/plugin-store.css',
  'css/plugin-intelligence.css',
  'css/plugin-marketing.css',
  'css/plugin-sourcing.css',
  'css/plugin-research.css',
  'css/plugin-market-gap.css',
  'css/plugin-lifecycle.css',
  'css/plugin-settings.css',
  'css/plugin-utilities.css'
];

function loadStyleSheet(href) {
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.onerror = function() {
    console.warn('[HuntDrop] Failed to load CSS:', href);
  };
  document.head.appendChild(link);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    CSS_ASSETS.forEach(loadStyleSheet);
  });
} else {
  CSS_ASSETS.forEach(loadStyleSheet);
}

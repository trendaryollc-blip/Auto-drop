// ============================================================================
// PLUGIN: Store Spy Center — Full-stack store intelligence (v3.0)
// Real data via cb-intelligence-service + web search, with demo fallback
// ============================================================================
(function () {
  const { PluginRegistry, Config, UI, EventBus } = window.HuntDrop;
  const esc = (s) => UI.escapeHtml(String(s || ''));

  let _section = null;
  let _liveInterval = null;
  let _revenueChart = null;
  let _currentTab = 'leaderboard';
  let _liveData = null;
  let _fetching = false;

  const COLORS = [
    'var(--accent-green)', 'var(--accent-cyan)', 'var(--accent-pink)',
    'var(--accent-orange)', 'var(--accent-purple)', 'var(--accent-red)',
    'var(--accent-yellow)', '#10b981', '#6366f1', '#f43f5e'
  ];

  const DEMO_STORES = [
    { id: 's1', name: 'Pawfect Picks', url: 'pawfect.myshopify.com', platform: 'Shopify', theme: 'Dawn', avatar: 'P', color: '#10b981', age: '8 months', category: 'Pet Supplies', revenue: 78500, traffic: 142000, convRate: 3.8, products: 156, ads: 23, aov: 42.50, pageSpeed: 92, seoScore: 88, bounceRate: 28, avgSession: '3:42', socialFB: 24500, socialIG: 67000, socialTK: 134000, trafficSources: { direct: 18, organic: 32, paid: 25, social: 18, referral: 7 }, topCountries: ['US', 'UK', 'CA'], apps: ['Klaviyo', 'Oberlo', 'Loox', 'Privy'], refundRate: 2.1 },
    { id: 's2', name: 'Glow Essentials', url: 'glowessentials.myshopify.com', platform: 'Shopify', theme: 'Refresh', avatar: 'G', color: '#ec4899', age: '14 months', category: 'Beauty & Skincare', revenue: 124000, traffic: 210000, convRate: 4.2, products: 89, ads: 34, aov: 58.90, pageSpeed: 88, seoScore: 91, bounceRate: 24, avgSession: '4:15', socialFB: 45000, socialIG: 156000, socialTK: 289000, trafficSources: { direct: 22, organic: 35, paid: 28, social: 12, referral: 3 }, topCountries: ['US', 'AU', 'UK'], apps: ['Klaviyo', 'Judge.me', 'Vitals', 'PageFly'], refundRate: 1.8 },
    { id: 's3', name: 'FitVault Pro', url: 'fitvault.myshopify.com', platform: 'Shopify', theme: 'Dawn', avatar: 'F', color: '#f97316', age: '6 months', category: 'Fitness Equipment', revenue: 52300, traffic: 89000, convRate: 3.1, products: 234, ads: 18, aov: 35.20, pageSpeed: 78, seoScore: 72, bounceRate: 38, avgSession: '2:48', socialFB: 12000, socialIG: 34000, socialTK: 78000, trafficSources: { direct: 15, organic: 28, paid: 32, social: 18, referral: 7 }, topCountries: ['US', 'CA', 'DE'], apps: ['Oberlo', 'Klaviyo', 'Smile.io'], refundRate: 3.5 },
    { id: 's4', name: 'Kawaii Decor', url: 'kawaiidecor.myshopify.com', platform: 'Shopify', theme: 'Sense', avatar: 'K', color: '#8b5cf6', age: '11 months', category: 'Home & Decor', revenue: 91200, traffic: 167000, convRate: 3.9, products: 312, ads: 27, aov: 29.80, pageSpeed: 95, seoScore: 85, bounceRate: 31, avgSession: '3:22', socialFB: 34000, socialIG: 89000, socialTK: 198000, trafficSources: { direct: 20, organic: 30, paid: 22, social: 23, referral: 5 }, topCountries: ['US', 'JP', 'UK'], apps: ['Klaviyo', 'Loox', 'Oberlo', 'Privy'], refundRate: 2.4 },
    { id: 's5', name: 'TechDrop Hub', url: 'techdrop.myshopify.com', platform: 'Shopify', theme: 'Dawn', avatar: 'T', color: '#ef4444', age: '9 months', category: 'Electronics', revenue: 156800, traffic: 298000, convRate: 2.8, products: 178, ads: 42, aov: 67.50, pageSpeed: 82, seoScore: 79, bounceRate: 35, avgSession: '2:55', socialFB: 56000, socialIG: 112000, socialTK: 245000, trafficSources: { direct: 25, organic: 22, paid: 35, social: 14, referral: 4 }, topCountries: ['US', 'UK', 'DE'], apps: ['Klaviyo', 'Oberlo', 'Vitals', 'AliReviews'], refundRate: 4.2 },
    { id: 's6', name: 'PostureTech', url: 'posturetech.myshopify.com', platform: 'Shopify', theme: 'Refresh', avatar: 'P', color: '#06b6d4', age: '5 months', category: 'Ergonomic Products', revenue: 34700, traffic: 56000, convRate: 3.5, products: 45, ads: 12, aov: 48.90, pageSpeed: 91, seoScore: 83, bounceRate: 26, avgSession: '3:58', socialFB: 8000, socialIG: 23000, socialTK: 56000, trafficSources: { direct: 16, organic: 38, paid: 20, social: 19, referral: 7 }, topCountries: ['US', 'CA', 'AU'], apps: ['Klaviyo', 'Judge.me', 'Loox'], refundRate: 1.9 },
    { id: 's7', name: 'NomadStyle', url: 'nomadstyle.myshopify.com', platform: 'Shopify', theme: 'Sense', avatar: 'N', color: '#eab308', age: '16 months', category: 'Fashion & Accessories', revenue: 203400, traffic: 345000, convRate: 4.5, products: 423, ads: 56, aov: 72.30, pageSpeed: 86, seoScore: 90, bounceRate: 22, avgSession: '4:32', socialFB: 78000, socialIG: 234000, socialTK: 412000, trafficSources: { direct: 28, organic: 33, paid: 24, social: 13, referral: 2 }, topCountries: ['US', 'UK', 'FR'], apps: ['Klaviyo', 'Oberlo', 'Loox', 'Smile.io', 'PageFly'], refundRate: 2.8 },
    { id: 's8', name: 'ZenSpace Co', url: 'zenspace.myshopify.com', platform: 'Shopify', theme: 'Dawn', avatar: 'Z', color: '#10b981', age: '7 months', category: 'Home & Living', revenue: 67900, traffic: 112000, convRate: 3.6, products: 198, ads: 19, aov: 38.40, pageSpeed: 94, seoScore: 87, bounceRate: 27, avgSession: '3:35', socialFB: 29000, socialIG: 78000, socialTK: 167000, trafficSources: { direct: 19, organic: 34, paid: 21, social: 19, referral: 7 }, topCountries: ['US', 'CA', 'UK'], apps: ['Klaviyo', 'Judge.me', 'Privy', 'Vitals'], refundRate: 2.0 },
    { id: 's9', name: 'WildRider', url: 'wildrider.myshopify.com', platform: 'Shopify', theme: 'Refresh', avatar: 'W', color: '#f43f5e', age: '10 months', category: 'Outdoor & Adventure', revenue: 89200, traffic: 156000, convRate: 3.3, products: 167, ads: 25, aov: 52.70, pageSpeed: 84, seoScore: 81, bounceRate: 33, avgSession: '3:10', socialFB: 41000, socialIG: 95000, socialTK: 201000, trafficSources: { direct: 17, organic: 29, paid: 30, social: 18, referral: 6 }, topCountries: ['US', 'AU', 'CA'], apps: ['Klaviyo', 'Oberlo', 'Loox', 'Smile.io'], refundRate: 3.1 },
    { id: 's10', name: 'LittleLux', url: 'littlelux.myshopify.com', platform: 'Shopify', theme: 'Sense', avatar: 'L', color: '#6366f1', age: '13 months', category: 'Kids & Baby', revenue: 112600, traffic: 189000, convRate: 4.1, products: 245, ads: 31, aov: 44.20, pageSpeed: 90, seoScore: 86, bounceRate: 25, avgSession: '4:05', socialFB: 62000, socialIG: 178000, socialTK: 323000, trafficSources: { direct: 21, organic: 36, paid: 23, social: 15, referral: 5 }, topCountries: ['US', 'UK', 'CA'], apps: ['Klaviyo', 'Judge.me', 'Loox', 'Oberlo', 'Privy'], refundRate: 2.3 }
  ];

  let STORES = [].concat(DEMO_STORES);

  const DEMO_ADS = [
    { store: 'Pawfect Picks', platform: 'Facebook', product: 'Interactive Cat Toy', hook: 'Your cat will be OBSESSED for hours', ctr: 4.8, spend: 120, status: 'scaling', age: 45, format: 'Video 1:1', objective: 'Conversions', engagement: '12.4K likes · 3.2K shares' },
    { store: 'Pawfect Picks', platform: 'TikTok', product: 'Self-Cleaning Pet Brush', hook: 'Watch the fur come off in seconds', ctr: 6.2, spend: 200, status: 'scaling', age: 32, format: 'Spark Ad', objective: 'Traffic', engagement: '45.6K views · 8.9K likes' },
    { store: 'Glow Essentials', platform: 'Facebook', product: 'LED Face Mask', hook: 'Dermatologists hate this simple trick', ctr: 5.1, spend: 180, status: 'scaling', age: 60, format: 'Carousel', objective: 'Conversions', engagement: '23.1K likes · 5.6K comments' },
    { store: 'Glow Essentials', platform: 'Instagram', product: 'Collagen Serum', hook: 'Age 25? Start this NOW before its too late', ctr: 3.9, spend: 95, status: 'running', age: 28, format: 'Reels', objective: 'Brand Awareness', engagement: '8.9K likes · 1.2K saves' },
    { store: 'FitVault Pro', platform: 'TikTok', product: 'Resistance Band Set', hook: 'Full gym workout in your living room', ctr: 5.7, spend: 150, status: 'scaling', age: 21, format: 'Spark Ad', objective: 'Conversions', engagement: '67.8K views · 15.3K likes' },
    { store: 'Kawaii Decor', platform: 'Facebook', product: 'LED Neon Sign', hook: 'Transform your room in 60 seconds', ctr: 4.2, spend: 85, status: 'running', age: 35, format: 'Video 9:16', objective: 'Traffic', engagement: '9.8K likes · 2.1K shares' },
    { store: 'Kawaii Decor', platform: 'Instagram', product: 'Cloud Lamp', hook: 'The coziest corner starts here', ctr: 3.5, spend: 65, status: 'testing', age: 14, format: 'Story', objective: 'Engagement', engagement: '4.3K likes · 890 comments' },
    { store: 'TechDrop Hub', platform: 'Facebook', product: 'Wireless Earbuds Pro', hook: 'AirPods quality at 1/3 the price', ctr: 5.9, spend: 250, status: 'scaling', age: 52, format: 'Video 1:1', objective: 'Conversions', engagement: '34.5K likes · 7.8K shares' },
    { store: 'PostureTech', platform: 'TikTok', product: 'Posture Corrector', hook: 'Fixed my back pain in 2 weeks', ctr: 7.1, spend: 180, status: 'scaling', age: 28, format: 'Spark Ad', objective: 'Conversions', engagement: '89.2K views · 21.4K likes' },
    { store: 'PostureTech', platform: 'Facebook', product: 'Standing Desk Mat', hook: 'Your back will thank you later', ctr: 4.4, spend: 90, status: 'running', age: 19, format: 'Carousel', objective: 'Traffic', engagement: '5.6K likes · 1.3K comments' },
    { store: 'NomadStyle', platform: 'Facebook', product: 'Minimalist Watch', hook: 'The only watch you will ever need', ctr: 4.7, spend: 160, status: 'scaling', age: 67, format: 'Video 1:1', objective: 'Conversions', engagement: '28.9K likes · 6.7K shares' },
    { store: 'NomadStyle', platform: 'Instagram', product: 'Leather Card Holder', hook: 'Slim. Premium. Effortless.', ctr: 3.8, spend: 75, status: 'running', age: 41, format: 'Reels', objective: 'Brand Awareness', engagement: '11.2K likes · 2.8K saves' },
    { store: 'ZenSpace Co', platform: 'TikTok', product: 'Aromatherapy Diffuser', hook: 'Turn your room into a 5-star spa', ctr: 5.3, spend: 110, status: 'running', age: 24, format: 'Spark Ad', objective: 'Traffic', engagement: '34.5K views · 7.8K likes' },
    { store: 'WildRider', platform: 'Facebook', product: 'Portable Hammock', hook: 'Camp anywhere in 30 seconds flat', ctr: 4.1, spend: 95, status: 'testing', age: 17, format: 'Video 9:16', objective: 'Conversions', engagement: '6.7K likes · 1.4K shares' },
    { store: 'WildRider', platform: 'TikTok', product: 'Solar Power Bank', hook: 'Never run out of battery again', ctr: 5.8, spend: 140, status: 'scaling', age: 31, format: 'Spark Ad', objective: 'Traffic', engagement: '52.1K views · 12.3K likes' },
    { store: 'LittleLux', platform: 'Facebook', product: 'Baby Sleep Suit', hook: 'Sleeping through the night guaranteed', ctr: 6.4, spend: 170, status: 'scaling', age: 38, format: 'Video 1:1', objective: 'Conversions', engagement: '19.8K likes · 4.5K comments' },
    { store: 'LittleLux', platform: 'Instagram', product: 'Organic Baby Set', hook: 'Pure ingredients only', ctr: 3.6, spend: 55, status: 'testing', age: 12, format: 'Story', objective: 'Engagement', engagement: '3.2K likes · 670 saves' },
    { store: 'Glow Essentials', platform: 'TikTok', product: 'Hair Growth Oil', hook: 'My hair grew 3 inches in 1 month', ctr: 8.2, spend: 300, status: 'scaling', age: 44, format: 'Spark Ad', objective: 'Conversions', engagement: '112K views · 34.5K likes' },
    { store: 'FitVault Pro', platform: 'Facebook', product: 'Ab Roller Wheel', hook: '6-pack in 30 days challenge', ctr: 4.9, spend: 80, status: 'running', age: 16, format: 'Carousel', objective: 'Traffic', engagement: '7.8K likes · 2.1K shares' },
    { store: 'TechDrop Hub', platform: 'TikTok', product: 'Phone Gimbal Stabilizer', hook: 'Cinematic video from your phone', ctr: 5.5, spend: 190, status: 'scaling', age: 37, format: 'Spark Ad', objective: 'Conversions', engagement: '78.4K views · 18.9K likes' }
  ];

  const PRICE_CHANGES = [
    { store: 'Pawfect Picks', product: 'Interactive Cat Toy', oldPrice: 29.99, newPrice: 24.99, change: -16.7 },
    { store: 'Glow Essentials', product: 'LED Face Mask', oldPrice: 49.99, newPrice: 39.99, change: -20.0 },
    { store: 'FitVault Pro', product: 'Resistance Band Set', oldPrice: 24.99, newPrice: 29.99, change: 20.0 },
    { store: 'Kawaii Decor', product: 'LED Neon Sign', oldPrice: 59.99, newPrice: 44.99, change: -25.0 },
    { store: 'TechDrop Hub', product: 'Wireless Earbuds Pro', oldPrice: 34.99, newPrice: 29.99, change: -14.3 },
    { store: 'NomadStyle', product: 'Minimalist Watch', oldPrice: 89.99, newPrice: 79.99, change: -11.1 },
    { store: 'ZenSpace Co', product: 'Aromatherapy Diffuser', oldPrice: 39.99, newPrice: 34.99, change: -12.5 },
    { store: 'WildRider', product: 'Solar Power Bank', oldPrice: 44.99, newPrice: 39.99, change: -11.1 },
    { store: 'LittleLux', product: 'Baby Sleep Suit', oldPrice: 34.99, newPrice: 29.99, change: -14.3 },
    { store: 'PostureTech', product: 'Posture Corrector', oldPrice: 29.99, newPrice: 24.99, change: -16.7 }
  ];

  const NEW_PRODUCTS = [
    { store: 'Pawfect Picks', name: 'GPS Pet Tracker', category: 'Pet Tech', price: 39.99, potentialScore: 87, trend: 'Rising' },
    { store: 'Glow Essentials', name: 'Korean Skincare Set', category: 'Beauty', price: 54.99, potentialScore: 92, trend: 'Hot' },
    { store: 'FitVault Pro', name: 'Smart Jump Rope', category: 'Fitness Tech', price: 29.99, potentialScore: 78, trend: 'Rising' },
    { store: 'Kawaii Decor', name: 'Projector Night Light', category: 'Home Tech', price: 34.99, potentialScore: 85, trend: 'Hot' },
    { store: 'TechDrop Hub', name: 'Magnetic Wireless Charger', category: 'Electronics', price: 24.99, potentialScore: 81, trend: 'Steady' },
    { store: 'PostureTech', name: 'Lumbar Support Pillow', category: 'Ergonomics', price: 44.99, potentialScore: 89, trend: 'Rising' },
    { store: 'NomadStyle', name: 'Titanium Bracelet', category: 'Accessories', price: 34.99, potentialScore: 76, trend: 'Steady' },
    { store: 'ZenSpace Co', name: 'Bamboo Desk Organizer', category: 'Home Office', price: 29.99, potentialScore: 83, trend: 'Rising' },
    { store: 'WildRider', name: 'Camping Lantern Pro', category: 'Outdoor', price: 27.99, potentialScore: 80, trend: 'Hot' },
    { store: 'LittleLux', name: 'Baby Monitor Camera', category: 'Baby Tech', price: 59.99, potentialScore: 91, trend: 'Hot' },
    { store: 'Pawfect Picks', name: 'Automatic Pet Feeder', category: 'Pet Tech', price: 49.99, potentialScore: 84, trend: 'Rising' },
    { store: 'Glow Essentials', name: 'Teeth Whitening Kit', category: 'Beauty', price: 34.99, potentialScore: 79, trend: 'Steady' },
    { store: 'TechDrop Hub', name: 'Smart Home Hub', category: 'Smart Home', price: 44.99, potentialScore: 88, trend: 'Hot' },
    { store: 'NomadStyle', name: 'Minimalist Backpack', category: 'Fashion', price: 49.99, potentialScore: 82, trend: 'Rising' },
    { store: 'ZenSpace Co', name: 'Heated Mug Warmer', category: 'Home Office', price: 19.99, potentialScore: 75, trend: 'Steady' }
  ];

  function fmtMoney(n) {
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
    return '$' + n;
  }

  function fmtNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  function getStoreByName(name) {
    for (var i = 0; i < STORES.length; i++) {
      if (STORES[i].name === name) return STORES[i];
    }
    return null;
  }

  function findStore(query) {
    if (!query) return null;
    var q = query.toLowerCase();
    for (var i = 0; i < STORES.length; i++) {
      var s = STORES[i];
      if (s.id === q) return s;
      if (s.name.toLowerCase().indexOf(q) !== -1) return s;
      if (s.url.toLowerCase().indexOf(q) !== -1) return s;
      if (s.url.split('.')[0].toLowerCase() === q) return s;
    }
    var firstWord = q.split(' ')[0];
    for (var j = 0; j < STORES.length; j++) {
      if (STORES[j].name.toLowerCase().indexOf(firstWord) !== -1) return STORES[j];
    }
    return null;
  }

  function getAdsForStore(storeName) {
    return DEMO_ADS.filter(function(a) { return a.store === storeName || a.competitor === storeName; });
  }

  function getChangesForStore(storeName) {
    return PRICE_CHANGES.filter(function(p) { return p.store === storeName || p.competitor === storeName; });
  }

  function getProductsForStore(storeName) {
    return NEW_PRODUCTS.filter(function(np) { return np.store === storeName || np.competitor === storeName; });
  }

  function renderAPIBanner() {
    var CBI = window.HuntDrop.CBIntelligenceService;
    if (!CBI) return '';
    var status = CBI.getStatus();
    if (status.status === 'live') return '';
    var km = window.HuntDrop.APIKeyManager;
    if (!km) return '';
    var keyStatus = km.getStatus();
    if (keyStatus.provider && keyStatus.provider !== 'none' && keyStatus.masked) return '';
    return '<div class="spy-api-banner">\ud83d\udd10 Connect API keys for live competitor data. <a href="#" id="spyOpenSettings">Open Settings</a></div>';
  }

  function renderLeaderboard() {
    if (!STORES.length) return '<div class="spy-empty-state">No store data available.</div>';
    var sorted = [].concat(STORES).sort(function(a, b) { return b.revenue - a.revenue; });
    var medals = ['\ud83e\udd47', '\ud83e\udd48', '\ud83e\udd49'];
    var h = '<div class="spy-leaderboard">';
    sorted.forEach(function(s, i) {
      var medal = i < 3 ? medals[i] : '<span class="spy-lb-rank">' + (i + 1) + '</span>';
      h += '<div class="spy-lb-row" data-store="' + esc(s.id) + '">' +
        '<span class="spy-lb-medal">' + medal + '</span>' +
        '<span class="spy-lb-dot" style="background:' + s.color + '"></span>' +
        '<div class="spy-lb-info"><div class="spy-lb-name">' + esc(s.name) + '</div><div class="spy-lb-cat">' + esc(s.category) + '</div></div>' +
        '<div class="spy-lb-stats">' +
          '<span class="spy-lb-stat"><span class="spy-lb-stat-label">Revenue</span><span class="spy-lb-stat-val" style="color:var(--accent-green)">' + fmtMoney(s.revenue) + '/mo</span></span>' +
          '<span class="spy-lb-stat"><span class="spy-lb-stat-label">Conv</span><span class="spy-lb-stat-val">' + s.convRate + '%</span></span>' +
          '<span class="spy-lb-stat"><span class="spy-lb-stat-label">Traffic</span><span class="spy-lb-stat-val">' + fmtNum(s.traffic) + '</span></span>' +
          '<span class="spy-lb-stat"><span class="spy-lb-stat-label">AOV</span><span class="spy-lb-stat-val">$' + s.aov + '</span></span>' +
          '<span class="spy-lb-stat"><span class="spy-lb-stat-label">Ads</span><span class="spy-lb-stat-val">' + s.ads + '</span></span>' +
        '</div>' +
      '</div>';
    });
    h += '</div>';
    return h;
  }

  function renderAds() {
    var ads = _liveData && _liveData.liveAds ? _liveData.liveAds : DEMO_ADS;
    var groups = { running: [], scaling: [], testing: [] };
    ads.forEach(function(a) {
      var st = a.status || 'running';
      if (!groups[st]) groups[st] = [];
      groups[st].push(a);
    });
    var h = '<div class="spy-ads-groups">';
    var order = [
      ['scaling', '\ud83d\ude80 Scaling Now', 'var(--accent-orange)'],
      ['running', '\u25b6 Running', 'var(--accent-green)'],
      ['testing', '\ud83e\udd13 Testing', 'var(--accent-purple)']
    ];
    order.forEach(function(g) {
      var list = groups[g[0]] || [];
      if (!list.length) return;
      h += '<div class="spy-ads-group"><div class="spy-ads-group-header" style="color:' + g[2] + '">' + g[1] + ' (' + list.length + ')</div><div class="spy-ads-grid">';
      list.forEach(function(a) {
        var store = findStore(a.store || a.competitor);
        var sc = a.status === 'scaling' ? 'spy-ad-scaling' : a.status === 'testing' ? 'spy-ad-testing' : 'spy-ad-running';
        h += '<div class="spy-ad-card">' +
          '<div class="spy-ad-header"><span class="spy-ad-platform">' + esc(a.platform) + '</span><span class="spy-ad-status ' + sc + '">' + esc(a.status) + '</span></div>' +
          '<div class="spy-ad-product">' + esc(a.product) + '</div>' +
          '<div class="spy-ad-hook">"' + esc(a.hook) + '"</div>' +
          '<div class="spy-ad-meta"><span>CTR: <strong style="color:var(--accent-cyan)">' + a.ctr + '%</strong></span><span>Spend: <strong>$' + a.spend + '/day</strong></span><span>' + a.age + ' day' + (a.age > 1 ? 's' : '') + ' old</span></div>' +
          '<div class="spy-ad-meta"><span>Format: ' + esc(a.format) + '</span><span>Objective: ' + esc(a.objective) + '</span></div>' +
          '<div class="spy-ad-engagement">Engagement: ' + esc(a.engagement) + '</div>' +
          (store ? '<div class="spy-ad-store"><span class="spy-ad-store-dot" style="background:' + store.color + '"></span>' + esc(store.name) + '</div>' : '') +
        '</div>';
      });
      h += '</div></div>';
    });
    return h + '</div>';
  }

  function renderPricing() {
    var changes = _liveData && _liveData.priceChanges ? _liveData.priceChanges : PRICE_CHANGES;
    var h = '<div class="spy-pricing-section">';
    h += '<div class="spy-pricing-alerts"><h3 class="spy-section-title">\u26a0\ufe0f Recent Price Changes</h3><div class="spy-price-list">';
    changes.forEach(function(p) {
      var isDown = p.change < 0;
      var store = findStore(p.store || p.competitor);
      h += '<div class="spy-price-item">' +
        '<span class="spy-price-store" style="color:' + (store ? store.color : 'var(--text-muted)') + '">' + esc(p.store || p.competitor) + '</span>' +
        '<span class="spy-price-product">' + esc(p.product) + '</span>' +
        '<span class="spy-price-old">$' + p.oldPrice.toFixed(2) + '</span>' +
        '<span class="spy-price-arrow">' + (isDown ? '\u2193' : '\u2191') + '</span>' +
        '<span class="spy-price-new" style="color:' + (isDown ? 'var(--accent-green)' : 'var(--accent-red)') + '">$' + p.newPrice.toFixed(2) + '</span>' +
        '<span class="spy-price-change" style="color:' + (isDown ? 'var(--accent-green)' : 'var(--accent-red)') + '">' + (isDown ? '' : '+') + p.change + '%</span>' +
      '</div>';
    });
    h += '</div></div>';
    h += '<div class="spy-pricing-insights"><h3 class="spy-section-title">\ud83d\udca1 Pricing Insights</h3><div class="spy-pricing-cards">';
    h += '<div class="spy-insight-card"><div class="spy-insight-val" style="color:var(--accent-green)">' + changes.filter(function(p) { return p.change < 0; }).length + '</div><div class="spy-insight-label">Price Drops</div><div class="spy-insight-sub">Competitors cutting prices</div></div>';
    h += '<div class="spy-insight-card"><div class="spy-insight-val" style="color:var(--accent-red)">' + changes.filter(function(p) { return p.change > 0; }).length + '</div><div class="spy-insight-label">Price Increases</div><div class="spy-insight-sub">Potential opportunity</div></div>';
    var avgChange = changes.length ? (changes.reduce(function(a, p) { return a + p.change; }, 0) / changes.length).toFixed(1) : '0';
    h += '<div class="spy-insight-card"><div class="spy-insight-val" style="color:var(--accent-cyan)">' + avgChange + '%</div><div class="spy-insight-label">Avg Change</div><div class="spy-insight-sub">Across all products</div></div>';
    h += '</div></div>';
    return h + '</div></div>';
  }

  function renderTechStack() {
    if (!STORES.length) return '<div class="spy-empty-state">No store data available.</div>';
    var h = '<div class="spy-tech-section">';
    STORES.forEach(function(s) {
      var psColor = s.pageSpeed >= 80 ? 'var(--accent-green)' : s.pageSpeed >= 60 ? 'var(--accent-orange)' : 'var(--accent-red)';
      var seoColor = s.seoScore >= 75 ? 'var(--accent-green)' : s.seoScore >= 60 ? 'var(--accent-orange)' : 'var(--accent-red)';
      var brColor = s.bounceRate <= 35 ? 'var(--accent-green)' : s.bounceRate <= 45 ? 'var(--accent-orange)' : 'var(--accent-red)';
      var sessionParts = String(s.avgSession || '0:0').split(':');
      var sessionMins = parseInt(sessionParts[0], 10) || 0;
      var sessionSecs = parseInt(sessionParts[1], 10) || 0;
      var sessionPct = Math.min((sessionMins * 60 + sessionSecs) / 6, 100);
      h += '<div class="spy-tech-card">' +
        '<div class="spy-tech-header"><span class="spy-tech-avatar" style="background:' + s.color + '22;color:' + s.color + '">' + esc(s.avatar) + '</span>' +
        '<div><div class="spy-tech-name">' + esc(s.name) + '</div><div class="spy-tech-platform">' + esc(s.platform) + ' \u00B7 ' + esc(s.theme) + '</div></div>' +
        '<div class="spy-tech-age">' + esc(s.age) + ' old</div></div>' +
        '<div class="spy-tech-apps">' + s.apps.map(function(a) { return '<span class="spy-tech-app">' + esc(a) + '</span>'; }).join('') + '</div>' +
        '<div class="spy-tech-metrics">' +
          '<div class="spy-tech-metric"><span class="spy-tech-metric-label">Page Speed</span><div class="spy-tech-bar"><div class="spy-tech-bar-fill" style="width:' + s.pageSpeed + '%;background:' + psColor + '"></div></div><span class="spy-tech-metric-val">' + s.pageSpeed + '/100</span></div>' +
          '<div class="spy-tech-metric"><span class="spy-tech-metric-label">SEO Score</span><div class="spy-tech-bar"><div class="spy-tech-bar-fill" style="width:' + s.seoScore + '%;background:' + seoColor + '"></div></div><span class="spy-tech-metric-val">' + s.seoScore + '/100</span></div>' +
          '<div class="spy-tech-metric"><span class="spy-tech-metric-label">Bounce Rate</span><div class="spy-tech-bar"><div class="spy-tech-bar-fill" style="width:' + s.bounceRate + '%;background:' + brColor + '"></div></div><span class="spy-tech-metric-val">' + s.bounceRate + '%</span></div>' +
          '<div class="spy-tech-metric"><span class="spy-tech-metric-label">Avg Session</span><div class="spy-tech-bar"><div class="spy-tech-bar-fill" style="width:' + sessionPct + '%;background:var(--accent-cyan)"></div></div><span class="spy-tech-metric-val">' + esc(s.avgSession) + '</span></div>' +
        '</div></div>';
    });
    return h + '</div>';
  }

  function renderTraffic() {
    if (!STORES.length) return '<div class="spy-empty-state">No store data available.</div>';
    var h = '<div class="spy-traffic-section"><h3 class="spy-section-title">\ud83c\udf10 Traffic Sources &amp; Social Presence</h3>';
    STORES.forEach(function(s) {
      h += '<div class="spy-traffic-card"><div class="spy-traffic-header"><span class="spy-traffic-avatar" style="background:' + s.color + '22;color:' + s.color + '">' + esc(s.avatar) + '</span><span class="spy-traffic-name">' + esc(s.name) + '</span></div>';
      h += '<div class="spy-traffic-sources">';
      ['direct', 'organic', 'paid', 'social', 'referral'].forEach(function(k) {
        var colors = { direct: 'var(--accent-cyan)', organic: 'var(--accent-green)', paid: 'var(--accent-orange)', social: 'var(--accent-pink)', referral: 'var(--accent-purple)' };
        h += '<div class="spy-traffic-bar"><span class="spy-traffic-bar-label">' + k.charAt(0).toUpperCase() + k.slice(1) + '</span><div class="spy-tech-bar" style="flex:1"><div class="spy-tech-bar-fill" style="width:' + s.trafficSources[k] + '%;background:' + colors[k] + '"></div></div><span class="spy-traffic-bar-val">' + s.trafficSources[k] + '%</span></div>';
      });
      h += '</div>';
      h += '<div class="spy-traffic-social"><span class="spy-social-icon fb">f</span><span>' + fmtNum(s.socialFB) + '</span><span class="spy-social-icon ig">\u25ce</span><span>' + fmtNum(s.socialIG) + '</span><span class="spy-social-icon tk">\u266a</span><span>' + fmtNum(s.socialTK) + '</span></div>';
      h += '</div>';
    });
    return h + '</div>';
  }

  function renderNewProducts() {
    var products = _liveData && _liveData.newProducts ? _liveData.newProducts : NEW_PRODUCTS;
    var h = '<div class="spy-new-section"><div class="spy-new-grid">';
    products.forEach(function(np) {
      var store = findStore(np.store || np.competitor);
      var scoreColor = np.potentialScore >= 85 ? 'var(--accent-green)' : np.potentialScore >= 70 ? 'var(--accent-orange)' : 'var(--accent-red)';
      var trendIcon = np.trend === 'Hot' ? '\ud83d\udd25' : np.trend === 'Rising' ? '\ud83d\udcc8' : '\u26aa';
      h += '<div class="spy-new-card">' +
        '<div class="spy-new-header"><span class="spy-new-category">' + esc(np.category) + '</span><span class="spy-new-trend">' + trendIcon + ' ' + esc(np.trend) + '</span></div>' +
        '<div class="spy-new-name">' + esc(np.name) + '</div>' +
        '<div class="spy-new-price">$' + np.price.toFixed(2) + '</div>' +
        '<div class="spy-new-score"><span class="spy-new-score-bar"><span class="spy-new-score-fill" style="width:' + np.potentialScore + '%;background:' + scoreColor + '"></span></span><span class="spy-new-score-val" style="color:' + scoreColor + '">' + np.potentialScore + '/100</span></div>' +
        (store ? '<div class="spy-new-store"><span class="spy-ad-store-dot" style="background:' + store.color + '"></span>' + esc(store.name) + '</div>' : '') +
      '</div>';
    });
    return h + '</div></div>';
  }

  function renderRevenue() {
    return '<div class="spy-revenue-section"><h3 class="spy-section-title">\ud83d\udcca Revenue Comparison</h3><div class="spy-revenue-chart-wrap" style="height:300px"><canvas id="spyRevenueChart"></canvas></div></div>';
  }

  function drawRevenueChart() {
    var el = _section ? _section.querySelector('#spyRevenueChart') : null;
    if (!el || typeof Chart === 'undefined') return;
    if (!STORES.length) return;
    if (_revenueChart) { try { _revenueChart.destroy(); } catch(e) {} }
    var sorted = [].concat(STORES).sort(function(a, b) { return b.revenue - a.revenue; });
    var labels = sorted.map(function(s) { return s.name.split(' ')[0]; });
    var revenues = sorted.map(function(s) { return s.revenue; });
    var computedColors = ['#10b981','#06b6d4','#ec4899','#f97316','#8b5cf6','#ef4444','#eab308','#10b981','#6366f1','#f43f5e'];
    _revenueChart = new Chart(el, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenue/mo',
          data: revenues,
          backgroundColor: computedColors.slice(0, revenues.length),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#555570', font: { family: 'JetBrains Mono', size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#555570', font: { family: 'JetBrains Mono', size: 10 }, callback: function(v) { return '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v); } } }
        }
      }
    });
  }

  function renderTab(tab) {
    _currentTab = tab;
    if (!_section) return;
    var content = _section.querySelector('#spyTabContent');
    if (!content) return;
    var html = '';
    switch (tab) {
      case 'leaderboard': html = renderLeaderboard(); break;
      case 'ads': html = renderAds(); break;
      case 'pricing': html = renderPricing(); break;
      case 'techstack': html = renderTechStack(); break;
      case 'traffic': html = renderTraffic(); break;
      case 'newproducts': html = renderNewProducts(); break;
      case 'revenue': html = renderRevenue(); break;
    }
    content.innerHTML = html;
    if (tab === 'revenue') drawRevenueChart();
    content.querySelectorAll('.spy-lb-row').forEach(function(row) {
      row.addEventListener('click', function() { showStoreProfile(row.dataset.store); });
    });
  }

  function showStoreProfile(storeId) {
    var store = null;
    for (var i = 0; i < STORES.length; i++) {
      if (STORES[i].id === storeId) { store = STORES[i]; break; }
    }
    if (!store) return;
    var container = _section ? _section.querySelector('#spyProfileContainer') : null;
    if (!container) return;
    var storeAds = getAdsForStore(store.name);
    var storeChanges = getChangesForStore(store.name);
    var storeProducts = getProductsForStore(store.name);
    var html = '<div class="spy-profile-overlay" id="spyOverlay"></div><div class="spy-profile-panel">';
    html += '<div class="spy-profile-header"><div class="spy-profile-avatar" style="background:' + store.color + '22;color:' + store.color + '">' + esc(store.avatar) + '</div><div><div class="spy-profile-name">' + esc(store.name) + '</div><div class="spy-profile-url">' + esc(store.url) + '</div></div><button class="spy-profile-close" id="spyCloseBtn">\u2715</button></div>';
    html += '<div class="spy-profile-stats">';
    html += '<div class="spy-profile-stat"><span class="spy-profile-stat-val" style="color:var(--accent-green)">' + fmtMoney(store.revenue) + '</span><span class="spy-profile-stat-label">Monthly Revenue</span></div>';
    html += '<div class="spy-profile-stat"><span class="spy-profile-stat-val">' + store.convRate + '%</span><span class="spy-profile-stat-label">Conversion</span></div>';
    html += '<div class="spy-profile-stat"><span class="spy-profile-stat-val" style="color:var(--accent-cyan)">' + fmtNum(store.traffic) + '</span><span class="spy-profile-stat-label">Monthly Traffic</span></div>';
    html += '<div class="spy-profile-stat"><span class="spy-profile-stat-val">$' + store.aov + '</span><span class="spy-profile-stat-label">Avg Order</span></div>';
    html += '</div>';

    if (storeAds.length) {
      html += '<div class="spy-profile-section"><h4><span>\ud83c\udfaf</span> Active Ads (' + storeAds.length + ')</h4><div class="spy-profile-ads">';
      storeAds.forEach(function(a) {
        html += '<div class="spy-profile-ad"><span class="spy-ad-platform">' + esc(a.platform) + '</span><span class="spy-ad-product">' + esc(a.product) + '</span><span style="color:var(--accent-cyan)">CTR ' + a.ctr + '%</span></div>';
      });
      html += '</div></div>';
    }

    if (storeChanges.length) {
      html += '<div class="spy-profile-section"><h4><span>\ud83d\udcc9</span> Price Changes (' + storeChanges.length + ')</h4><div class="spy-profile-prices">';
      storeChanges.forEach(function(p) {
        var sign = p.change > 0 ? '+' : '';
        html += '<div class="spy-profile-price"><span>' + esc(p.product) + '</span><span style="text-decoration:line-through;color:var(--text-muted)">$' + p.oldPrice.toFixed(2) + '</span><span>\u2192</span><span style="color:var(--accent-green);font-weight:600">$' + p.newPrice.toFixed(2) + '</span><span style="color:var(--accent-green);font-size:11px">' + sign + p.change + '%</span></div>';
      });
      html += '</div></div>';
    }

    html += '<div class="spy-profile-section"><h4><span>\ud83d\udd27</span> Tech Stack</h4><div class="spy-profile-apps">' +
      store.apps.map(function(a) { return '<span class="spy-tech-app">' + esc(a) + '</span>'; }).join('') +
    '</div></div>';

    html += '<div class="spy-profile-section"><h4><span>\ud83d\udcf1</span> Social Following</h4><div class="spy-profile-social">' +
      '<div class="spy-social-item"><span class="spy-social-icon fb">f</span><span class="spy-social-val">' + fmtNum(store.socialFB) + '</span></div>' +
      '<div class="spy-social-item"><span class="spy-social-icon ig">\u25ce</span><span class="spy-social-val">' + fmtNum(store.socialIG) + '</span></div>' +
      '<div class="spy-social-item"><span class="spy-social-icon tk">\u266a</span><span class="spy-social-val">' + fmtNum(store.socialTK) + '</span></div>' +
    '</div></div>';

    html += '<div class="spy-profile-section"><h4><span>\ud83c\udf10</span> Traffic Sources</h4><div class="spy-profile-traffic">';
    ['direct','organic','paid','social','referral'].forEach(function(k) {
      html += '<div class="spy-profile-traffic-row"><span>' + k.charAt(0).toUpperCase() + k.slice(1) + '</span><div class="spy-tech-bar" style="flex:1"><div class="spy-tech-bar-fill" style="width:' + store.trafficSources[k] + '%;background:var(--accent-cyan)"></div></div><span>' + store.trafficSources[k] + '%</span></div>';
    });
    html += '</div></div>';

    html += '<div class="spy-profile-section"><h4><span>\ud83d\udcca</span> Performance</h4><div class="spy-profile-perf">' +
      '<div class="spy-profile-perf-row"><span>Page Speed</span><span style="color:' + (store.pageSpeed >= 80 ? 'var(--accent-green)' : 'var(--accent-orange)') + '">' + store.pageSpeed + '/100</span></div>' +
      '<div class="spy-profile-perf-row"><span>SEO Score</span><span style="color:' + (store.seoScore >= 75 ? 'var(--accent-green)' : 'var(--accent-orange)') + '">' + store.seoScore + '/100</span></div>' +
      '<div class="spy-profile-perf-row"><span>Bounce Rate</span><span style="color:' + (store.bounceRate <= 35 ? 'var(--accent-green)' : 'var(--accent-orange)') + '">' + store.bounceRate + '%</span></div>' +
      '<div class="spy-profile-perf-row"><span>Avg Session</span><span>' + esc(store.avgSession) + '</span></div>' +
      '<div class="spy-profile-perf-row"><span>Refund Rate</span><span style="color:' + (store.refundRate <= 3 ? 'var(--accent-green)' : 'var(--accent-orange)') + '">' + store.refundRate + '%</span></div>' +
    '</div></div>';

    html += '<div class="spy-profile-section"><h4><span>\ud83c\udfaf</span> Audience Insights</h4><div class="spy-profile-perf">' +
      '<div class="spy-profile-perf-row"><span>Top Country</span><span style="color:var(--accent-cyan)">' + esc(store.topCountries[0] || 'US') + '</span></div>' +
      '<div class="spy-profile-perf-row"><span>All Countries</span><span>' + esc(store.topCountries.join(', ')) + '</span></div>' +
      '<div class="spy-profile-perf-row"><span>Category</span><span>' + esc(store.category) + '</span></div>' +
      '<div class="spy-profile-perf-row"><span>Active Ads</span><span>' + store.ads + '</span></div>' +
    '</div></div>';

    html += '</div></div>';
    container.innerHTML = html;

    var overlay = container.querySelector('#spyOverlay');
    var closeBtn = container.querySelector('#spyCloseBtn');
    function closeProfile() { container.innerHTML = ''; }
    if (overlay) overlay.addEventListener('click', closeProfile);
    if (closeBtn) closeBtn.addEventListener('click', closeProfile);
  }

  function updateOverviewCards() {
    if (!_section) return;
    var totalRevenue = STORES.reduce(function(a, s) { return a + s.revenue; }, 0);
    var totalProducts = STORES.reduce(function(a, s) { return a + s.products; }, 0);
    var avgConv = STORES.length ? (STORES.reduce(function(a, s) { return a + s.convRate; }, 0) / STORES.length).toFixed(1) : '0.0';
    var cards = _section.querySelectorAll('.spy-ov-value');
    if (cards.length >= 6) {
      cards[0].textContent = STORES.length;
      cards[1].textContent = fmtMoney(totalRevenue);
      cards[2].textContent = totalProducts;
      cards[3].textContent = avgConv + '%';
      cards[4].textContent = DEMO_ADS.length;
      cards[5].textContent = NEW_PRODUCTS.length;
    }
  }

  function updateLive() {
    if (!_section || _currentTab !== 'leaderboard') return;
    _section.querySelectorAll('.spy-lb-dot').forEach(function(dot) {
      dot.style.opacity = dot.style.opacity === '0.3' ? '1' : '0.3';
    });
  }

  function fetchLiveData() {
    if (_fetching) return;
    _fetching = true;
    var CBI = window.HuntDrop.CBIntelligenceService;
    if (!CBI) { _fetching = false; return; }
    var status = CBI.getStatus();
    if (status.status === 'live') {
      _liveData = {
        competitors: CBI.getCachedData('competitors'),
        liveAds: CBI.getCachedData('liveAds'),
        priceChanges: CBI.getCachedData('priceChanges'),
        newProducts: CBI.getCachedData('newProducts')
      };
      if (_liveData.competitors && Array.isArray(_liveData.competitors) && _liveData.competitors.length > 0) {
        STORES = _liveData.competitors.map(function(c, i) {
          return {
            id: c.id || 'c' + (i+1),
            name: c.name || 'Store ' + (i+1),
            url: c.url || (c.name || 'store').toLowerCase().replace(/\s+/g, '') + '.myshopify.com',
            platform: c.platform || 'Shopify',
            theme: c.theme || 'Dawn',
            avatar: c.avatar || (c.name || 'S')[0],
            color: c.color || COLORS[i % COLORS.length],
            age: c.age || '3 months',
            category: c.cat || c.category || 'General',
            revenue: c.revenue || 50000,
            traffic: c.traffic || 100000,
            convRate: c.convRate || 3.0,
            products: c.products || 150,
            ads: c.ads || 15,
            aov: c.aov || 40.00,
            pageSpeed: c.pageSpeed || 80,
            seoScore: c.seoScore || 75,
            bounceRate: c.bounceRate || 30,
            avgSession: c.avgSession || '3:00',
            socialFB: c.social ? (c.social.fb || 0) : 20000,
            socialIG: c.social ? (c.social.ig || 0) : 50000,
            socialTK: c.social ? (c.social.tk || 0) : 100000,
            trafficSources: c.trafficSources || { direct:20, organic:30, paid:25, social:15, referral:10 },
            topCountries: c.topCountries || ['US','UK'],
            apps: c.apps || ['Klaviyo'],
            refundRate: c.refundRate || 2.5
          };
        });
      }
      if (_liveData.liveAds && Array.isArray(_liveData.liveAds)) {
        DEMO_ADS.length = 0;
        _liveData.liveAds.forEach(function(a) { DEMO_ADS.push(a); });
      }
      if (_liveData.priceChanges && Array.isArray(_liveData.priceChanges)) {
        PRICE_CHANGES.length = 0;
        _liveData.priceChanges.forEach(function(p) { PRICE_CHANGES.push(p); });
      }
      if (_liveData.newProducts && Array.isArray(_liveData.newProducts)) {
        NEW_PRODUCTS.length = 0;
        _liveData.newProducts.forEach(function(np) { NEW_PRODUCTS.push(np); });
      }
      updateOverviewCards();
      if (_currentTab === 'leaderboard') renderTab('leaderboard');
    }
    _fetching = false;
  }

  const SpyCenterPlugin = {
    id: 'spy-center',
    name: 'Store Spy Center',
    version: '3.0.0',
    description: 'Full-stack store intelligence with live data from AI + web search',
    dependencies: ['search-engine'],

    init: function(_ctx) {
      Config.defaults('spyCenter', { enabled: true });
    },

    mount: function(_ctx) {
      var container = UI.$('sections-container');
      if (!container) return;

      var section = document.createElement('section');
      section.className = 'section section-spy';
      section.id = 'section-spy-center';

      var totalRevenue = STORES.reduce(function(a, s) { return a + s.revenue; }, 0);
      var totalProducts = STORES.reduce(function(a, s) { return a + s.products; }, 0);
      var avgConv = (STORES.reduce(function(a, s) { return a + s.convRate; }, 0) / STORES.length).toFixed(1);

      section.innerHTML = '<div class="section-inner">' +
        '<div class="spy-hero">' +
          '<div class="spy-hero-badge"><span class="spy-hero-badge-dot"></span>Competitive Intelligence</div>' +
          '<h2 class="spy-hero-title">Store Spy Center</h2>' +
          '<p class="spy-hero-desc">Full-stack intelligence on top Shopify stores — revenue, traffic, tech stack, and live ad campaigns.</p>' +
          '<div class="spy-search-bar"><input type="text" id="spySearchInput" class="spy-search" placeholder="Search any store... (e.g. Pawfect, NomadStyle, petlover)" /><button class="spy-search-btn" id="spySearchBtn">\ud83d\udd0e</button></div>' +
          '<div class="spy-quick-picks"><button class="spy-quick-btn" data-store="s1">Pawfect Picks</button>' +
          '<button class="spy-quick-btn" data-store="s2">Glow Essentials</button>' +
          '<button class="spy-quick-btn" data-store="s5">TechDrop Hub</button>' +
          '<button class="spy-quick-btn" data-store="s7">NomadStyle</button>' +
          '<button class="spy-quick-btn" data-store="s4">Kawaii Decor</button>' +
          '<button class="spy-quick-btn" data-store="s6">PostureTech</button>' +
          '</div>' +
        '</div>' +
        renderAPIBanner() +
        '<div class="spy-overview">' +
          '<div class="spy-ov-card"><div class="spy-ov-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">\ud83c\udfe2</div><div class="spy-ov-info"><div class="spy-ov-value">' + STORES.length + '</div><div class="spy-ov-label">Stores Tracked</div></div></div>' +
          '<div class="spy-ov-card"><div class="spy-ov-icon" style="background:var(--accent-green-dim);color:var(--accent-green)">\ud83d\udcb6</div><div class="spy-ov-info"><div class="spy-ov-value">' + fmtMoney(totalRevenue) + '</div><div class="spy-ov-label">Combined Revenue</div></div></div>' +
          '<div class="spy-ov-card"><div class="spy-ov-icon" style="background:var(--accent-orange-dim);color:var(--accent-orange)">\ud83d\udce6</div><div class="spy-ov-info"><div class="spy-ov-value">' + totalProducts + '</div><div class="spy-ov-label">Total Products</div></div></div>' +
          '<div class="spy-ov-card"><div class="spy-ov-icon" style="background:rgba(236,72,153,0.12);color:var(--accent-pink)">\ud83d\udcc8</div><div class="spy-ov-info"><div class="spy-ov-value">' + avgConv + '%</div><div class="spy-ov-label">Avg Conversion</div></div></div>' +
          '<div class="spy-ov-card"><div class="spy-ov-icon" style="background:rgba(251,191,36,0.12);color:var(--accent-yellow)">\ud83c\udfaf</div><div class="spy-ov-info"><div class="spy-ov-value">' + DEMO_ADS.length + '</div><div class="spy-ov-label">Active Ads</div></div></div>' +
          '<div class="spy-ov-card"><div class="spy-ov-icon" style="background:rgba(168,85,247,0.12);color:var(--accent-purple)">\u26a1</div><div class="spy-ov-info"><div class="spy-ov-value">' + NEW_PRODUCTS.length + '</div><div class="spy-ov-label">New Products</div></div></div>' +
        '</div>' +
        '<div class="spy-tabs">' +
          '<button class="spy-tab active" data-tab="leaderboard">Leaderboard</button>' +
          '<button class="spy-tab" data-tab="ads">Ad Intelligence (' + DEMO_ADS.length + ')</button>' +
          '<button class="spy-tab" data-tab="pricing">Pricing Intel</button>' +
          '<button class="spy-tab" data-tab="techstack">Tech Stack</button>' +
          '<button class="spy-tab" data-tab="traffic">Traffic &amp; SEO</button>' +
          '<button class="spy-tab" data-tab="newproducts">New Products (' + NEW_PRODUCTS.length + ')</button>' +
          '<button class="spy-tab" data-tab="revenue">Revenue Chart</button>' +
        '</div>' +
        '<div class="spy-tab-content" id="spyTabContent"></div>' +
        '<div id="spyProfileContainer"></div>' +
        (window.HuntDrop.renderRelatedTools ? window.HuntDrop.renderRelatedTools([
          { section:'section-battlefield', name:'Competitor Battlefield', desc:'Live competitive intel', icon:'\u2694\ufe0f', color:'#FF6B6B' },
          { section:'section-ai-analyst', name:'AI Analyst', desc:'Deep product analysis', icon:'\ud83e\udde0', color:'#4ECDC4' },
          { section:'section-niche-radar', name:'Niche Radar', desc:'Track niche trends', icon:'\ud83d\udce1', color:'#45B7D1' },
          { section:'section-lifecycle', name:'Product Lifecycle', desc:'Monitor maturity', icon:'\ud83d\udcca', color:'#96CEB4' }
        ]) : '') +
      '</div>';

      container.appendChild(section);
      _section = section;

      renderTab('leaderboard');
      fetchLiveData();
      _liveInterval = setInterval(updateLive, 2000);

      var settingsLink = section.querySelector('#spyOpenSettings');
      if (settingsLink) {
        settingsLink.addEventListener('click', function(e) {
          e.preventDefault();
          if (EventBus && EventBus.emit) EventBus.emit('navigate', 'section-settings');
        });
      }

      section.querySelectorAll('.spy-tab').forEach(function(btn) {
        btn.addEventListener('click', function() {
          section.querySelectorAll('.spy-tab').forEach(function(t) { t.classList.remove('active'); });
          btn.classList.add('active');
          renderTab(btn.dataset.tab);
        });
      });

      var searchInput = section.querySelector('#spySearchInput');
      var searchBtn = section.querySelector('#spySearchBtn');
      function doSearch() {
        var q = (searchInput ? searchInput.value : '').trim();
        if (!q) return;
        var store = findStore(q);
        if (store) {
          showStoreProfile(store.id);
        } else {
          var content = section.querySelector('#spyTabContent');
          if (content) content.innerHTML = '<div class="spy-empty-state">No store found matching "' + esc(q) + '"</div>';
        }
      }
      if (searchBtn) searchBtn.addEventListener('click', doSearch);
      if (searchInput) searchInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') doSearch(); });

      section.querySelectorAll('.spy-quick-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { showStoreProfile(btn.dataset.store); });
      });
    },

    unmount: function(_ctx) {
      if (_liveInterval) { clearInterval(_liveInterval); _liveInterval = null; }
      if (_revenueChart) { try { _revenueChart.destroy(); } catch(e) {} _revenueChart = null; }
      _section = null;
      _liveData = null;
      _fetching = false;
    }
  };

  PluginRegistry.register(SpyCenterPlugin.id, SpyCenterPlugin);
})();

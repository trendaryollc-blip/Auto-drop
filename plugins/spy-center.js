// ============================================================================
// PLUGIN: Store Spy Center — Full-stack store intelligence
// ============================================================================
(function () {
  const { PluginRegistry, Config, UI } = window.HuntDrop;
  const esc = (s) => UI.escapeHtml(s);

  let _section = null;
  let _liveInterval = null;
  let _revenueChart = null;

  const STORES = [
    {
      id: 's1',
      name: 'PetLover',
      url: 'petlover.myshopify.com',
      avatar: 'P',
      color: '#FF6B6B',
      category: 'Pet Supplies',
      revenue: 42800,
      traffic: 89000,
      convRate: 3.2,
      products: 186,
      ads: 24,
      age: '2 years',
      platform: 'Shopify',
      theme: 'Debut',
      pageSpeed: 88,
      seoScore: 82,
      bounceRate: 28,
      avgSession: '4:32',
      aov: 38.5,
      refundRate: 2.1,
      lastActive: '2 min ago',
      socialFB: 24500,
      socialIG: 67800,
      socialTK: 134000,
      trafficSources: { direct: 22, organic: 35, paid: 28, social: 10, referral: 5 },
      apps: ['Klaviyo', 'Judge.me', 'Upsell Wizard', 'Loox'],
    },
    {
      id: 's2',
      name: 'FitGear Pro',
      url: 'fitgearpro.myshopify.com',
      avatar: 'F',
      color: '#4ECDC4',
      category: 'Fitness',
      revenue: 38200,
      traffic: 72000,
      convRate: 2.8,
      products: 124,
      ads: 18,
      age: '1 year',
      platform: 'Shopify',
      theme: 'Dawn',
      pageSpeed: 92,
      seoScore: 78,
      bounceRate: 32,
      avgSession: '3:48',
      aov: 52.9,
      refundRate: 3.5,
      lastActive: '5 min ago',
      socialFB: 18200,
      socialIG: 45600,
      socialTK: 98000,
      trafficSources: { direct: 18, organic: 30, paid: 35, social: 12, referral: 5 },
      apps: ['Omnisend', 'Loox', 'Vitals', 'PageFly'],
    },
    {
      id: 's3',
      name: 'BeautyGlow',
      url: 'beautyglow.com',
      avatar: 'B',
      color: '#96CEB4',
      category: 'Beauty',
      revenue: 67500,
      traffic: 145000,
      convRate: 3.8,
      products: 210,
      ads: 32,
      age: '3 years',
      platform: 'Shopify',
      theme: 'Impact',
      pageSpeed: 78,
      seoScore: 88,
      bounceRate: 25,
      avgSession: '5:12',
      aov: 44.2,
      refundRate: 1.8,
      lastActive: 'Just now',
      socialFB: 56000,
      socialIG: 234000,
      socialTK: 312000,
      trafficSources: { direct: 25, organic: 32, paid: 25, social: 14, referral: 4 },
      apps: ['Klaviyo', 'Yotpo', 'ReConvert', 'Searchspring'],
    },
    {
      id: 's4',
      name: 'TechNova',
      url: 'technova.io',
      avatar: 'T',
      color: '#45B7D1',
      category: 'Electronics',
      revenue: 95000,
      traffic: 210000,
      convRate: 2.5,
      products: 340,
      ads: 45,
      age: '4 years',
      platform: 'Shopify',
      theme: 'Turbo',
      pageSpeed: 70,
      seoScore: 72,
      bounceRate: 38,
      avgSession: '3:20',
      aov: 89.99,
      refundRate: 4.2,
      lastActive: '1 min ago',
      socialFB: 34000,
      socialIG: 89000,
      socialTK: 178000,
      trafficSources: { direct: 20, organic: 28, paid: 32, social: 15, referral: 5 },
      apps: ['Bold Upsell', 'Klaviyo', 'Stamped.io', 'Privy'],
    },
    {
      id: 's5',
      name: 'Kawaii Decor',
      url: 'kawaiidecor.myshopify.com',
      avatar: 'K',
      color: '#FFD93D',
      category: 'Home & Garden',
      revenue: 28900,
      traffic: 56000,
      convRate: 3.5,
      products: 95,
      ads: 12,
      age: '8 months',
      platform: 'Shopify',
      theme: 'Refresh',
      pageSpeed: 95,
      seoScore: 85,
      bounceRate: 22,
      avgSession: '5:45',
      aov: 32.1,
      refundRate: 1.2,
      lastActive: '8 min ago',
      socialFB: 12000,
      socialIG: 89000,
      socialTK: 245000,
      trafficSources: { direct: 15, organic: 38, paid: 22, social: 20, referral: 5 },
      apps: ['Judge.me', 'Klaviyo', 'In Cart Upsell', 'Product Options'],
    },
    {
      id: 's6',
      name: 'UrbanStyle',
      url: 'urbanstyle.co',
      avatar: 'U',
      color: '#A855F7',
      category: 'Fashion',
      revenue: 54300,
      traffic: 118000,
      convRate: 2.9,
      products: 280,
      ads: 28,
      age: '2 years',
      platform: 'Shopify',
      theme: 'Prestige',
      pageSpeed: 75,
      seoScore: 80,
      bounceRate: 35,
      avgSession: '3:55',
      aov: 67.5,
      refundRate: 5.8,
      lastActive: '3 min ago',
      socialFB: 42000,
      socialIG: 178000,
      socialTK: 290000,
      trafficSources: { direct: 18, organic: 25, paid: 30, social: 22, referral: 5 },
      apps: ['Loox', 'Klaviyo', 'Size Charts', 'Route'],
    },
    {
      id: 's7',
      name: 'BabyBliss',
      url: 'babybliss.myshopify.com',
      avatar: 'C',
      color: '#F472B6',
      category: 'Baby & Kids',
      revenue: 31200,
      traffic: 64000,
      convRate: 3.6,
      products: 130,
      ads: 15,
      age: '1 year',
      platform: 'Shopify',
      theme: 'Sense',
      pageSpeed: 90,
      seoScore: 76,
      bounceRate: 30,
      avgSession: '4:10',
      aov: 41.8,
      refundRate: 2.4,
      lastActive: '12 min ago',
      socialFB: 28000,
      socialIG: 112000,
      socialTK: 87000,
      trafficSources: { direct: 20, organic: 33, paid: 27, social: 15, referral: 5 },
      apps: ['Judge.me', 'Klaviyo', 'Gift Box', 'Upsell Master'],
    },
    {
      id: 's8',
      name: 'EcoLiving',
      url: 'ecoliving.shop',
      avatar: 'E',
      color: '#22C55E',
      category: 'Sustainable',
      revenue: 19800,
      traffic: 42000,
      convRate: 3.1,
      products: 78,
      ads: 9,
      age: '6 months',
      platform: 'Shopify',
      theme: 'Craft',
      pageSpeed: 96,
      seoScore: 90,
      bounceRate: 20,
      avgSession: '6:05',
      aov: 29.9,
      refundRate: 0.8,
      lastActive: '20 min ago',
      socialFB: 8500,
      socialIG: 34000,
      socialTK: 67000,
      trafficSources: { direct: 12, organic: 42, paid: 18, social: 23, referral: 5 },
      apps: ['Shopify Email', 'Judge.me', 'EcoCart', 'Privy'],
    },
    {
      id: 's9',
      name: 'PostureTech',
      url: 'posturetech.com',
      avatar: 'P',
      color: '#EF4444',
      category: 'Health',
      revenue: 52000,
      traffic: 98000,
      convRate: 3.0,
      products: 65,
      ads: 22,
      age: '18 months',
      platform: 'Shopify',
      theme: 'Crave',
      pageSpeed: 82,
      seoScore: 79,
      bounceRate: 31,
      avgSession: '3:40',
      aov: 74.9,
      refundRate: 3.8,
      lastActive: '4 min ago',
      socialFB: 15000,
      socialIG: 56000,
      socialTK: 210000,
      trafficSources: { direct: 22, organic: 30, paid: 33, social: 10, referral: 5 },
      apps: ['Klaviyo', 'Loox', 'Bold Subscriptions', 'PageFly'],
    },
    {
      id: 's10',
      name: 'StarLight',
      url: 'starlight.store',
      avatar: 'S',
      color: '#F59E0B',
      category: 'Jewelry',
      revenue: 73000,
      traffic: 155000,
      convRate: 2.7,
      products: 190,
      ads: 35,
      age: '3 years',
      platform: 'Shopify',
      theme: 'Dawn',
      pageSpeed: 85,
      seoScore: 86,
      bounceRate: 26,
      avgSession: '4:50',
      aov: 96.4,
      refundRate: 2.5,
      lastActive: 'Just now',
      socialFB: 38000,
      socialIG: 145000,
      socialTK: 267000,
      trafficSources: { direct: 24, organic: 34, paid: 24, social: 13, referral: 5 },
      apps: ['Klaviyo', 'Yotpo', 'Bold Upsell', 'Loox'],
    },
  ];

  const STORE_ADS = [
    {
      store: 'PetLover',
      product: 'Smart Pet Fountain',
      platform: 'Facebook',
      hook: 'Your dog deserves filtered water too',
      ctr: 3.8,
      spend: 85,
      status: 'scaling',
      format: 'Video 15s',
      objective: 'Conversions',
      engagement: '12.4K likes, 890 shares',
      age: 14,
    },
    {
      store: 'PetLover',
      product: 'GPS Pet Tracker Collar',
      platform: 'TikTok',
      hook: 'Never lose your best friend again',
      ctr: 4.2,
      spend: 120,
      status: 'scaling',
      format: 'Spark Ad',
      objective: 'Conversions',
      engagement: '45K views, 2.1K saves',
      age: 21,
    },
    {
      store: 'PetLover',
      product: 'Interactive Cat Toy',
      platform: 'Instagram',
      hook: 'Your cat will actually play with this',
      ctr: 2.9,
      spend: 45,
      status: 'running',
      format: 'Carousel',
      objective: 'Traffic',
      engagement: '5.6K likes, 340 comments',
      age: 7,
    },
    {
      store: 'BeautyGlow',
      product: 'LED Face Mask',
      platform: 'Facebook',
      hook: 'Dermatologists hate this $29 hack',
      ctr: 5.1,
      spend: 200,
      status: 'scaling',
      format: 'Video 30s',
      objective: 'Conversions',
      engagement: '28K likes, 3.4K shares',
      age: 30,
    },
    {
      store: 'BeautyGlow',
      product: 'Hair Growth Serum',
      platform: 'TikTok',
      hook: '3 months of growth in 30 seconds',
      ctr: 6.8,
      spend: 350,
      status: 'scaling',
      format: 'Spark Ad',
      objective: 'Conversions',
      engagement: '890K views, 45K saves',
      age: 45,
    },
    {
      store: 'BeautyGlow',
      product: 'Collagen Supplements',
      platform: 'Instagram',
      hook: 'What you eat shows on your face',
      ctr: 3.2,
      spend: 90,
      status: 'running',
      format: 'Reels',
      objective: 'Brand Awareness',
      engagement: '18K likes, 1.2K comments',
      age: 12,
    },
    {
      store: 'TechNova',
      product: 'Wireless Earbuds Pro',
      platform: 'YouTube',
      hook: 'AirPods quality at 1/3 the price',
      ctr: 2.8,
      spend: 150,
      status: 'scaling',
      format: 'Skippable In-Stream',
      objective: 'Conversions',
      engagement: '67K views, 1.8K likes',
      age: 28,
    },
    {
      store: 'TechNova',
      product: 'Smart Home Hub',
      platform: 'Facebook',
      hook: 'Control your entire home with one device',
      ctr: 3.5,
      spend: 110,
      status: 'running',
      format: 'Collection Ad',
      objective: 'Conversions',
      engagement: '8.9K clicks, 560 shares',
      age: 16,
    },
    {
      store: 'Kawaii Decor',
      product: 'LED Cloud Lamp',
      platform: 'TikTok',
      hook: 'POV: Your room finally looks aesthetic',
      ctr: 7.2,
      spend: 180,
      status: 'scaling',
      format: 'Spark Ad',
      objective: 'Conversions',
      engagement: '1.2M views, 89K saves',
      age: 35,
    },
    {
      store: 'Kawaii Decor',
      product: 'Cherry Blossom Wall Art',
      platform: 'Instagram',
      hook: 'Transform any wall in 60 seconds',
      ctr: 4.5,
      spend: 65,
      status: 'running',
      format: 'Carousel',
      objective: 'Traffic',
      engagement: '12K likes, 890 saves',
      age: 10,
    },
    {
      store: 'UrbanStyle',
      product: 'Oversized Vintage Tee',
      platform: 'TikTok',
      hook: 'This $18 tee looks like $180',
      ctr: 5.8,
      spend: 220,
      status: 'scaling',
      format: 'Spark Ad',
      objective: 'Conversions',
      engagement: '567K views, 34K saves',
      age: 25,
    },
    {
      store: 'UrbanStyle',
      product: 'Cargo Pants Collection',
      platform: 'Facebook',
      hook: 'Comfortable pants that actually fit',
      ctr: 3.1,
      spend: 95,
      status: 'running',
      format: 'Video 15s',
      objective: 'Conversions',
      engagement: '9.2K likes, 670 shares',
      age: 18,
    },
    {
      store: 'PostureTech',
      product: 'Posture Corrector Belt',
      platform: 'Facebook',
      hook: 'Fix your posture in 14 days',
      ctr: 4.8,
      spend: 175,
      status: 'scaling',
      format: 'Video 20s',
      objective: 'Conversions',
      engagement: '34K likes, 5.6K shares',
      age: 40,
    },
    {
      store: 'PostureTech',
      product: 'Standing Desk Mat',
      platform: 'YouTube',
      hook: 'Your back will thank you',
      ctr: 2.6,
      spend: 80,
      status: 'running',
      format: 'Bumper',
      objective: 'Brand Awareness',
      engagement: '23K views, 890 likes',
      age: 22,
    },
    {
      store: 'StarLight',
      product: 'Birthstone Necklace',
      platform: 'Instagram',
      hook: 'Her birthstone, her story',
      ctr: 4.1,
      spend: 160,
      status: 'scaling',
      format: 'Reels',
      objective: 'Conversions',
      engagement: '23K likes, 2.8K saves',
      age: 20,
    },
    {
      store: 'StarLight',
      product: 'Stacking Ring Set',
      platform: 'TikTok',
      hook: '$12 rings that look $200',
      ctr: 6.5,
      spend: 280,
      status: 'scaling',
      format: 'Spark Ad',
      objective: 'Conversions',
      engagement: '780K views, 56K saves',
      age: 38,
    },
    {
      store: 'FitGear Pro',
      product: 'Resistance Band Set',
      platform: 'TikTok',
      hook: 'Full gym in a bag',
      ctr: 5.4,
      spend: 95,
      status: 'scaling',
      format: 'Spark Ad',
      objective: 'Conversions',
      engagement: '340K views, 28K saves',
      age: 15,
    },
    {
      store: 'BabyBliss',
      product: 'Baby Sleep Sack',
      platform: 'Facebook',
      hook: 'Finally, sleep through the night',
      ctr: 4.6,
      spend: 110,
      status: 'scaling',
      format: 'Video 15s',
      objective: 'Conversions',
      engagement: '19K likes, 3.2K shares',
      age: 24,
    },
    {
      store: 'EcoLiving',
      product: 'Reusable Food Wraps',
      platform: 'Instagram',
      hook: 'Say goodbye to plastic wrap forever',
      ctr: 3.9,
      spend: 40,
      status: 'testing',
      format: 'Carousel',
      objective: 'Traffic',
      engagement: '8.9K likes, 1.1K saves',
      age: 5,
    },
    {
      store: 'EcoLiving',
      product: 'Bamboo Toothbrush Set',
      platform: 'TikTok',
      hook: 'The last toothbrush you will ever buy',
      ctr: 4.3,
      spend: 55,
      status: 'testing',
      format: 'Spark Ad',
      objective: 'Conversions',
      engagement: '156K views, 12K saves',
      age: 8,
    },
  ];

  const PRICE_CHANGES = [
    {
      store: 'TechNova',
      product: 'Wireless Earbuds Pro',
      oldPrice: 59.99,
      newPrice: 44.99,
      change: -25,
      impact: 'HIGH',
      time: '2 hours ago',
    },
    {
      store: 'BeautyGlow',
      product: 'LED Face Mask',
      oldPrice: 29.99,
      newPrice: 34.99,
      change: 17,
      impact: 'HIGH',
      time: '5 hours ago',
    },
    {
      store: 'Kawaii Decor',
      product: 'LED Cloud Lamp',
      oldPrice: 24.99,
      newPrice: 19.99,
      change: -20,
      impact: 'MEDIUM',
      time: '8 hours ago',
    },
    {
      store: 'UrbanStyle',
      product: 'Oversized Vintage Tee',
      oldPrice: 18.99,
      newPrice: 21.99,
      change: 16,
      impact: 'MEDIUM',
      time: '12 hours ago',
    },
    {
      store: 'StarLight',
      product: 'Birthstone Necklace',
      oldPrice: 34.99,
      newPrice: 29.99,
      change: -14,
      impact: 'MEDIUM',
      time: '1 day ago',
    },
    {
      store: 'PetLover',
      product: 'Smart Pet Fountain',
      oldPrice: 39.99,
      newPrice: 34.99,
      change: -13,
      impact: 'LOW',
      time: '1 day ago',
    },
    {
      store: 'PostureTech',
      product: 'Posture Corrector Belt',
      oldPrice: 49.99,
      newPrice: 39.99,
      change: -20,
      impact: 'HIGH',
      time: '2 days ago',
    },
    {
      store: 'FitGear Pro',
      product: 'Resistance Band Set',
      oldPrice: 24.99,
      newPrice: 29.99,
      change: 20,
      impact: 'MEDIUM',
      time: '2 days ago',
    },
    {
      store: 'EcoLiving',
      product: 'Reusable Food Wraps',
      oldPrice: 14.99,
      newPrice: 12.99,
      change: -13,
      impact: 'LOW',
      time: '3 days ago',
    },
    {
      store: 'BabyBliss',
      product: 'Baby Sleep Sack',
      oldPrice: 32.99,
      newPrice: 29.99,
      change: -9,
      impact: 'LOW',
      time: '3 days ago',
    },
  ];

  const NEW_PRODUCTS = [
    {
      store: 'Kawaii Decor',
      name: 'Sakura Projector Lamp',
      category: 'Home Lighting',
      price: 39.99,
      score: 92,
      time: '1 day ago',
    },
    {
      store: 'BeautyGlow',
      name: 'Scalp Massager Brush',
      category: 'Hair Care',
      price: 12.99,
      score: 88,
      time: '1 day ago',
    },
    {
      store: 'TechNova',
      name: 'Portable Mini Fan',
      category: 'Electronics',
      price: 19.99,
      score: 85,
      time: '2 days ago',
    },
    {
      store: 'StarLight',
      name: 'Moon Phase Necklace',
      category: 'Jewelry',
      price: 24.99,
      score: 91,
      time: '2 days ago',
    },
    {
      store: 'PetLover',
      name: 'Cat Scratcher Lounge',
      category: 'Pet Supplies',
      price: 34.99,
      score: 87,
      time: '3 days ago',
    },
    {
      store: 'UrbanStyle',
      name: 'Holographic Jacket',
      category: 'Fashion',
      price: 45.99,
      score: 83,
      time: '3 days ago',
    },
    {
      store: 'PostureTech',
      name: 'Heated Neck Massager',
      category: 'Health',
      price: 29.99,
      score: 90,
      time: '4 days ago',
    },
    {
      store: 'EcoLiving',
      name: 'Beeswax Candle Kit',
      category: 'Sustainable',
      price: 18.99,
      score: 86,
      time: '5 days ago',
    },
    {
      store: 'BabyBliss',
      name: 'Teething Toy Set',
      category: 'Baby & Kids',
      price: 14.99,
      score: 84,
      time: '5 days ago',
    },
    { store: 'FitGear Pro', name: 'Yoga Mat Towel', category: 'Fitness', price: 22.99, score: 89, time: '6 days ago' },
    {
      store: 'BeautyGlow',
      name: 'Eyelash Growth Kit',
      category: 'Beauty',
      price: 27.99,
      score: 93,
      time: '1 week ago',
    },
    {
      store: 'TechNova',
      name: 'Desk Phone Stand',
      category: 'Electronics',
      price: 15.99,
      score: 82,
      time: '1 week ago',
    },
    { store: 'StarLight', name: 'Tennis Bracelet', category: 'Jewelry', price: 49.99, score: 94, time: '1 week ago' },
    {
      store: 'Kawaii Decor',
      name: 'Mushroom Table Lamp',
      category: 'Home Lighting',
      price: 28.99,
      score: 90,
      time: '1 week ago',
    },
    {
      store: 'UrbanStyle',
      name: 'Cargo Jogger Pants',
      category: 'Fashion',
      price: 32.99,
      score: 86,
      time: '1 week ago',
    },
  ];

  function fmtMoney(n) {
    return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function fmtNum(n) {
    return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n.toString();
  }

  function getStoreScore(s) {
    let r = 0;
    r += (s.revenue / 500) * 0.2;
    r += s.convRate * 10 * 0.2;
    r += (s.products / 2) * 0.1;
    r += s.seoScore * 0.15;
    r += s.pageSpeed * 0.1;
    r += (100 - s.bounceRate) * 0.1;
    r += (s.ads > 15 ? 15 : s.ads) * 0.15;
    return Math.min(100, Math.round(r));
  }

  function getHealthGrade(score) {
    if (score >= 85) return { grade: 'A+', color: 'var(--accent-green)' };
    if (score >= 75) return { grade: 'A', color: 'var(--accent-green)' };
    if (score >= 65) return { grade: 'B+', color: 'var(--accent-cyan)' };
    if (score >= 55) return { grade: 'B', color: 'var(--accent-cyan)' };
    if (score >= 45) return { grade: 'C', color: 'var(--accent-orange)' };
    return { grade: 'D', color: 'var(--accent-red)' };
  }

  function renderTab(tab) {
    const el = _section.querySelector('#spyTabContent');
    if (!el) return;
    switch (tab) {
      case 'leaderboard':
        el.innerHTML = renderLeaderboard();
        bindLeaderboardClicks();
        break;
      case 'ads':
        el.innerHTML = renderAds();
        break;
      case 'pricing':
        el.innerHTML = renderPricing();
        break;
      case 'techstack':
        el.innerHTML = renderTechStack();
        break;
      case 'traffic':
        el.innerHTML = renderTraffic();
        break;
      case 'newproducts':
        el.innerHTML = renderNewProducts();
        break;
      case 'revenue':
        el.innerHTML = renderRevenue();
        setTimeout(function () {
          drawRevenueChart();
        }, 100);
        break;
    }
  }

  function renderLeaderboard() {
    const ranked = STORES.map(function (s) {
      return { store: s, score: getStoreScore(s), health: getHealthGrade(getStoreScore(s)) };
    }).sort(function (a, b) {
      return b.score - a.score;
    });
    let h = '';
    h += '<div class="spy-lb-list">';
    ranked.forEach(function (r, i) {
      const s = r.store;
      h +=
        '<div class="spy-lb-row" data-store="' +
        s.id +
        '">' +
        '<div class="spy-lb-rank">#' +
        (i + 1) +
        '</div>' +
        '<div class="spy-lb-avatar" style="background:' +
        s.color +
        '22;color:' +
        s.color +
        '">' +
        s.avatar +
        '</div>' +
        '<div class="spy-lb-info"><div class="spy-lb-name">' +
        esc(s.name) +
        '</div><div class="spy-lb-url">' +
        esc(s.url) +
        '</div></div>' +
        '<div class="spy-lb-stats">' +
        '<div class="spy-lb-stat"><span class="spy-lb-stat-val" style="color:var(--accent-green)">' +
        fmtMoney(s.revenue) +
        '</span><span class="spy-lb-stat-lbl">Revenue/mo</span></div>' +
        '<div class="spy-lb-stat"><span class="spy-lb-stat-val">' +
        fmtNum(s.traffic) +
        '</span><span class="spy-lb-stat-lbl">Traffic</span></div>' +
        '<div class="spy-lb-stat"><span class="spy-lb-stat-val">' +
        s.convRate +
        '%</span><span class="spy-lb-stat-lbl">Conv.</span></div>' +
        '<div class="spy-lb-stat"><span class="spy-lb-stat-val">' +
        s.products +
        '</span><span class="spy-lb-stat-lbl">Products</span></div>' +
        '<div class="spy-lb-stat"><span class="spy-lb-stat-val">' +
        s.ads +
        '</span><span class="spy-lb-stat-lbl">Ads</span></div>' +
        '</div>' +
        '<div class="spy-lb-health"><span class="spy-lb-grade" style="background:' +
        r.health.color +
        '18;color:' +
        r.health.color +
        '">' +
        r.health.grade +
        '</span><span class="spy-lb-score" style="color:' +
        r.health.color +
        '">' +
        r.score +
        '</span></div>' +
        '<div class="spy-lb-active"><span class="spy-lb-dot"></span>' +
        s.lastActive +
        '</div>' +
        '</div>';
    });
    h += '</div>';
    return h;
  }

  function bindLeaderboardClicks() {
    _section.querySelectorAll('.spy-lb-row').forEach(function (row) {
      row.addEventListener('click', function () {
        showStoreProfile(row.dataset.store);
      });
    });
  }

  function renderAds() {
    const groups = { running: [], scaling: [], testing: [] };
    STORE_ADS.forEach(function (a) {
      groups[a.status] = groups[a.status] || [];
      groups[a.status].push(a);
    });
    let h = '<div class="spy-ads-groups">';
    const order = [
      ['scaling', '&#128640; Scaling Now', 'var(--accent-orange)'],
      ['running', '&#9654; Running', 'var(--accent-green)'],
      ['testing', '&#129513; Testing', 'var(--accent-purple)'],
    ];
    order.forEach(function (g) {
      const list = groups[g[0]] || [];
      if (!list.length) return;
      h +=
        '<div class="spy-ads-group"><div class="spy-ads-group-header" style="color:' +
        g[2] +
        '">' +
        g[1] +
        ' (' +
        list.length +
        ')</div><div class="spy-ads-grid">';
      list.forEach(function (a) {
        const store = STORES.find(function (s) {
          return s.name === a.store;
        });
        const sc =
          a.status === 'scaling' ? 'spy-ad-scaling' : a.status === 'testing' ? 'spy-ad-testing' : 'spy-ad-running';
        h +=
          '<div class="spy-ad-card">' +
          '<div class="spy-ad-header"><span class="spy-ad-platform">' +
          a.platform +
          '</span><span class="spy-ad-status ' +
          sc +
          '">' +
          a.status +
          '</span></div>' +
          '<div class="spy-ad-product">' +
          esc(a.product) +
          '</div>' +
          '<div class="spy-ad-hook">"' +
          esc(a.hook) +
          '"</div>' +
          '<div class="spy-ad-meta"><span>CTR: <strong style="color:var(--accent-cyan)">' +
          a.ctr +
          '%</strong></span><span>Spend: <strong>$' +
          a.spend +
          '/day</strong></span><span>' +
          a.age +
          ' day' +
          (a.age > 1 ? 's' : '') +
          ' old</span></div>' +
          '<div class="spy-ad-meta"><span>Format: ' +
          a.format +
          '</span><span>Objective: ' +
          a.objective +
          '</span></div>' +
          '<div class="spy-ad-engagement">Engagement: ' +
          a.engagement +
          '</div>' +
          (store
            ? '<div class="spy-ad-store"><span class="spy-ad-store-dot" style="background:' +
              store.color +
              '"></span>' +
              esc(store.name) +
              '</div>'
            : '') +
          '</div>';
      });
      h += '</div></div>';
    });
    h += '</div>';
    return h;
  }

  function renderPricing() {
    let h = '<div class="spy-pricing-section">';
    h +=
      '<div class="spy-pricing-alerts"><h3 class="spy-section-title">&#9888;&#65039; Recent Price Changes</h3><div class="spy-price-list">';
    PRICE_CHANGES.forEach(function (p) {
      const isDown = p.change < 0;
      const ic =
        p.impact === 'HIGH' ? 'spy-impact-high' : p.impact === 'MEDIUM' ? 'spy-impact-medium' : 'spy-impact-low';
      h +=
        '<div class="spy-price-row">' +
        '<div class="spy-price-store">' +
        esc(p.store) +
        '</div>' +
        '<div class="spy-price-product">' +
        esc(p.product) +
        '</div>' +
        '<div class="spy-price-change">' +
        '<span class="spy-price-old">$' +
        p.oldPrice.toFixed(2) +
        '</span>' +
        '<span class="spy-price-arrow">' +
        (isDown ? '\u2193' : '\u2191') +
        '</span>' +
        '<span class="spy-price-new" style="color:' +
        (isDown ? 'var(--accent-green)' : 'var(--accent-red)') +
        '">$' +
        p.newPrice.toFixed(2) +
        '</span>' +
        '<span class="spy-price-pct" style="color:' +
        (isDown ? 'var(--accent-green)' : 'var(--accent-red)') +
        '">' +
        (isDown ? '' : '+') +
        p.change +
        '%</span>' +
        '</div>' +
        '<div class="spy-price-impact ' +
        ic +
        '">' +
        p.impact +
        '</div>' +
        '<div class="spy-price-time">' +
        p.time +
        '</div>' +
        '</div>';
    });
    h += '</div></div>';
    h +=
      '<div class="spy-pricing-compare"><h3 class="spy-section-title">&#128202; Cross-Platform Price Comparison</h3>';
    h += '<div class="spy-compare-grid">';
    STORES.slice(0, 5).forEach(function (s) {
      h +=
        '<div class="spy-compare-card"><div class="spy-compare-header"><span class="spy-compare-avatar" style="background:' +
        s.color +
        '22;color:' +
        s.color +
        '">' +
        s.avatar +
        '</span><span class="spy-compare-name">' +
        esc(s.name) +
        '</span></div>';
      h += '<div class="spy-compare-prices">';
      const platforms = ['aliexpress', 'amazon', 'shopify', 'ebay', 'temu'];
      platforms.forEach(function (p) {
        const price = Math.round(
          s.aov *
            (p === 'aliexpress' ? 0.3 : p === 'amazon' ? 0.85 : p === 'shopify' ? 0.75 : p === 'ebay' ? 0.65 : 0.25)
        );
        h +=
          '<div class="spy-compare-price"><span class="spy-compare-platform">' +
          p.charAt(0).toUpperCase() +
          p.slice(1) +
          '</span><span class="spy-compare-val">$' +
          price +
          '</span></div>';
      });
      h += '</div></div>';
    });
    h += '</div></div></div>';
    return h;
  }

  function renderTechStack() {
    let h = '<div class="spy-tech-section">';
    STORES.forEach(function (s) {
      const psColor =
        s.pageSpeed >= 80 ? 'var(--accent-green)' : s.pageSpeed >= 60 ? 'var(--accent-orange)' : 'var(--accent-red)';
      const seoColor =
        s.seoScore >= 75 ? 'var(--accent-green)' : s.seoScore >= 60 ? 'var(--accent-orange)' : 'var(--accent-red)';
      const brColor =
        s.bounceRate <= 35 ? 'var(--accent-green)' : s.bounceRate <= 45 ? 'var(--accent-orange)' : 'var(--accent-red)';
      const sessionPct = (parseInt(s.avgSession.split(':')[0]) * 60 + parseInt(s.avgSession.split(':')[1])) / 6;
      h +=
        '<div class="spy-tech-card">' +
        '<div class="spy-tech-header"><span class="spy-tech-avatar" style="background:' +
        s.color +
        '22;color:' +
        s.color +
        '">' +
        s.avatar +
        '</span><div><div class="spy-tech-name">' +
        esc(s.name) +
        '</div><div class="spy-tech-platform">' +
        esc(s.platform) +
        ' \u00B7 ' +
        esc(s.theme) +
        '</div></div><div class="spy-tech-age">' +
        esc(s.age) +
        ' old</div></div>' +
        '<div class="spy-tech-apps">' +
        s.apps
          .map(function (a) {
            return '<span class="spy-tech-app">' + a + '</span>';
          })
          .join('') +
        '</div>' +
        '<div class="spy-tech-metrics">' +
        '<div class="spy-tech-metric"><span class="spy-tech-metric-label">Page Speed</span><div class="spy-tech-bar"><div class="spy-tech-bar-fill" style="width:' +
        s.pageSpeed +
        '%;background:' +
        psColor +
        '"></div></div><span class="spy-tech-metric-val">' +
        s.pageSpeed +
        '/100</span></div>' +
        '<div class="spy-tech-metric"><span class="spy-tech-metric-label">SEO Score</span><div class="spy-tech-bar"><div class="spy-tech-bar-fill" style="width:' +
        s.seoScore +
        '%;background:' +
        seoColor +
        '"></div></div><span class="spy-tech-metric-val">' +
        s.seoScore +
        '/100</span></div>' +
        '<div class="spy-tech-metric"><span class="spy-tech-metric-label">Bounce Rate</span><div class="spy-tech-bar"><div class="spy-tech-bar-fill" style="width:' +
        s.bounceRate +
        '%;background:' +
        brColor +
        '"></div></div><span class="spy-tech-metric-val">' +
        s.bounceRate +
        '%</span></div>' +
        '<div class="spy-tech-metric"><span class="spy-tech-metric-label">Avg Session</span><div class="spy-tech-bar"><div class="spy-tech-bar-fill" style="width:' +
        sessionPct +
        '%;background:var(--accent-cyan)"></div></div><span class="spy-tech-metric-val">' +
        s.avgSession +
        '</span></div>' +
        '</div></div>';
    });
    h += '</div>';
    return h;
  }

  function renderTraffic() {
    let h = '<div class="spy-traffic-section">';
    h += '<h3 class="spy-section-title">&#127760; Traffic Sources &amp; Social Presence</h3>';
    h += '<div class="spy-traffic-grid">';
    STORES.forEach(function (s) {
      h +=
        '<div class="spy-traffic-card">' +
        '<div class="spy-traffic-header"><span class="spy-traffic-avatar" style="background:' +
        s.color +
        '22;color:' +
        s.color +
        '">' +
        s.avatar +
        '</span><div><div class="spy-traffic-name">' +
        esc(s.name) +
        '</div><div class="spy-traffic-cat">' +
        esc(s.category) +
        '</div></div></div>' +
        '<div class="spy-traffic-sources">';
      const srcs = s.trafficSources;
      ['direct', 'organic', 'paid', 'social', 'referral'].forEach(function (k) {
        h +=
          '<div class="spy-traffic-source"><div class="spy-traffic-source-label">' +
          k.charAt(0).toUpperCase() +
          k.slice(1) +
          '</div><div class="spy-traffic-source-bar"><div class="spy-traffic-source-fill" style="width:' +
          srcs[k] +
          '%"></div></div><div class="spy-traffic-source-val">' +
          srcs[k] +
          '%</div></div>';
      });
      h +=
        '</div>' +
        '<div class="spy-traffic-social">' +
        '<div class="spy-social-item"><span class="spy-social-icon fb">f</span><span class="spy-social-val">' +
        fmtNum(s.socialFB) +
        '</span></div>' +
        '<div class="spy-social-item"><span class="spy-social-icon ig">\u25CE</span><span class="spy-social-val">' +
        fmtNum(s.socialIG) +
        '</span></div>' +
        '<div class="spy-social-item"><span class="spy-social-icon tk">\u266A</span><span class="spy-social-val">' +
        fmtNum(s.socialTK) +
        '</span></div>' +
        '</div>' +
        '<div class="spy-traffic-total"><span>Total Traffic:</span><span style="color:var(--accent-cyan);font-family:var(--font-mono);font-weight:700">' +
        fmtNum(s.traffic) +
        '/mo</span></div>' +
        '</div>';
    });
    h += '</div></div>';
    return h;
  }

  function renderNewProducts() {
    let h = '<div class="spy-newprod-list">';
    NEW_PRODUCTS.forEach(function (np) {
      h +=
        '<div class="spy-newprod-row">' +
        '<div class="spy-newprod-store">' +
        esc(np.store) +
        '</div>' +
        '<div class="spy-newprod-info"><div class="spy-newprod-name">' +
        esc(np.name) +
        '</div><div class="spy-newprod-cat">' +
        esc(np.category) +
        '</div></div>' +
        '<div class="spy-newprod-price">$' +
        np.price.toFixed(2) +
        '</div>' +
        '<div class="spy-newprod-score"><span class="spy-newprod-score-val">' +
        np.score +
        '</span>/100</div>' +
        '<div class="spy-newprod-time">' +
        np.time +
        '</div>' +
        '</div>';
    });
    h += '</div>';
    return h;
  }

  function renderRevenue() {
    let h =
      '<div class="spy-revenue-section">' +
      '<h3 class="spy-section-title">&#128200; Revenue Estimation</h3>' +
      '<p class="spy-revenue-desc">Estimated monthly revenue based on traffic, conversion rates, and average order values</p>' +
      '<div class="spy-chart-container"><canvas id="spyRevenueChart"></canvas></div>' +
      '<div class="spy-revenue-table">' +
      '<div class="spy-rev-header"><span>Store</span><span>Traffic</span><span>Conv.</span><span>AOV</span><span>Revenue</span><span>Daily</span><span>Refund</span></div>';
    const sorted = [].concat(STORES).sort(function (a, b) {
      return b.revenue - a.revenue;
    });
    sorted.forEach(function (s) {
      const daily = Math.round(s.revenue / 30);
      h +=
        '<div class="spy-rev-row"><span class="spy-rev-name">' +
        esc(s.name) +
        '</span><span>' +
        fmtNum(s.traffic) +
        '</span><span>' +
        s.convRate +
        '%</span><span>$' +
        s.aov.toFixed(2) +
        '</span><span style="color:var(--accent-green)">' +
        fmtMoney(s.revenue) +
        '</span><span>' +
        fmtMoney(daily) +
        '</span><span style="color:var(--accent-red)">' +
        s.refundRate +
        '%</span></div>';
    });
    h += '</div></div>';
    return h;
  }

  function drawRevenueChart() {
    const el = _section.querySelector('#spyRevenueChart');
    if (!el || typeof Chart === 'undefined' || Chart === window.Chart) return;
    if (_revenueChart)
      try {
        _revenueChart.destroy();
      } catch {
        /* ignored */
      }
    const labels = STORES.map(function (s) {
      return s.name.split(' ')[0];
    });
    const revenues = STORES.map(function (s) {
      return s.revenue;
    });
    _revenueChart = new Chart(el, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            data: revenues,
            backgroundColor: STORES.map(function (s) {
              return s.color + '88';
            }),
            borderColor: STORES.map(function (s) {
              return s.color;
            }),
            borderWidth: 1,
            borderRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111119',
            borderColor: '#2a2a3d',
            borderWidth: 1,
            titleFont: { family: 'Outfit', size: 11 },
            bodyFont: { family: 'JetBrains Mono', size: 12 },
            padding: 10,
            displayColors: false,
            callbacks: {
              label: function (ctx) {
                return '$' + ctx.parsed.y.toLocaleString() + '/mo';
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.025)' },
            ticks: { color: '#555570', font: { family: 'JetBrains Mono', size: 9 } },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.025)' },
            ticks: {
              color: '#555570',
              font: { family: 'JetBrains Mono', size: 9 },
              callback: function (v) {
                return '$' + fmtNum(v);
              },
            },
          },
        },
      },
    });
  }

  function showStoreProfile(storeId) {
    const s = STORES.find(function (st) {
      return st.id === storeId;
    });
    if (!s) return;
    const container = _section.querySelector('#spyProfileContainer');
    if (!container) return;

    const score = getStoreScore(s);
    const health = getHealthGrade(score);
    const dailyRev = Math.round(s.revenue / 30);
    const monthlyOrders = Math.round(s.revenue / s.aov);
    const storeAds = STORE_ADS.filter(function (a) {
      return a.store === s.name;
    });
    const newProds = NEW_PRODUCTS.filter(function (p) {
      return p.store === s.name;
    });
    const priceAlerts = PRICE_CHANGES.filter(function (p) {
      return p.store === s.name;
    });

    let h =
      '<div class="spy-profile-overlay" id="spyProfileOverlay"></div>' +
      '<div class="spy-profile-panel" id="spyProfilePanel">' +
      '<div class="spy-profile-header">' +
      '<div class="spy-profile-title-row"><div class="spy-profile-avatar" style="background:' +
      s.color +
      '22;color:' +
      s.color +
      ';font-size:28px">' +
      s.avatar +
      '</div><div><h3 class="spy-profile-name">' +
      esc(s.name) +
      '</h3><div class="spy-profile-url">' +
      esc(s.url) +
      ' \u00B7 ' +
      esc(s.platform) +
      '</div></div>' +
      '<button class="spy-profile-close" id="spyProfileClose">\u2715</button></div>' +
      '<div class="spy-profile-badges">' +
      '<span class="spy-badge" style="background:' +
      health.color +
      '18;color:' +
      health.color +
      '">' +
      health.grade +
      ' (' +
      score +
      ')</span>' +
      '<span class="spy-badge spy-badge-cat">' +
      esc(s.category) +
      '</span>' +
      '<span class="spy-badge spy-badge-age">' +
      esc(s.age) +
      ' old</span>' +
      '<span class="spy-badge spy-badge-theme">' +
      esc(s.theme) +
      '</span>' +
      '</div></div>' +
      '<div class="spy-profile-stats">' +
      '<div class="spy-profile-stat"><div class="spy-profile-stat-val" style="color:var(--accent-green)">' +
      fmtMoney(s.revenue) +
      '</div><div class="spy-profile-stat-lbl">Revenue/mo</div></div>' +
      '<div class="spy-profile-stat"><div class="spy-profile-stat-val">' +
      fmtMoney(dailyRev) +
      '</div><div class="spy-profile-stat-lbl">Daily Rev</div></div>' +
      '<div class="spy-profile-stat"><div class="spy-profile-stat-val">' +
      fmtNum(s.traffic) +
      '</div><div class="spy-profile-stat-lbl">Traffic/mo</div></div>' +
      '<div class="spy-profile-stat"><div class="spy-profile-stat-val">' +
      s.convRate +
      '%</div><div class="spy-profile-stat-lbl">Conversion</div></div>' +
      '<div class="spy-profile-stat"><div class="spy-profile-stat-val">' +
      fmtNum(monthlyOrders) +
      '</div><div class="spy-profile-stat-lbl">Orders/mo</div></div>' +
      '<div class="spy-profile-stat"><div class="spy-profile-stat-val">$' +
      s.aov.toFixed(2) +
      '</div><div class="spy-profile-stat-lbl">Avg Order</div></div>' +
      '</div>' +
      '<div class="spy-profile-sections">';

    h += '<div class="spy-profile-grid">';

    h += '<div>';
    if (storeAds.length > 0) {
      h +=
        '<div class="spy-profile-section"><h4><span>&#127919;</span> Active Ads (' +
        storeAds.length +
        ')</h4><div class="spy-profile-ads">';
      storeAds.forEach(function (a) {
        h +=
          '<div class="spy-profile-ad"><span class="spy-profile-ad-platform">' +
          esc(a.platform) +
          '</span><span class="spy-profile-ad-hook">"' +
          esc(a.hook) +
          '"</span><span class="spy-profile-ad-ctr">CTR: ' +
          a.ctr +
          '%</span></div>';
      });
      h += '</div></div>';
    }

    if (newProds.length > 0) {
      h +=
        '<div class="spy-profile-section"><h4><span>&#127381;</span> New Products (' +
        newProds.length +
        ')</h4><div class="spy-profile-newprods">';
      newProds.forEach(function (p) {
        h +=
          '<div class="spy-profile-newprod"><span>' +
          esc(p.name) +
          '</span><span style="color:var(--accent-green)">$' +
          p.price.toFixed(2) +
          '</span><span style="color:var(--accent-cyan)">' +
          p.score +
          '/100</span></div>';
      });
      h += '</div></div>';
    }

    if (priceAlerts.length > 0) {
      h +=
        '<div class="spy-profile-section"><h4><span>&#128176;</span> Price Changes (' +
        priceAlerts.length +
        ')</h4><div class="spy-profile-prices">';
      priceAlerts.forEach(function (p) {
        const isDown = p.change < 0;
        h +=
          '<div class="spy-profile-price"><span>' +
          esc(p.product) +
          '</span><span class="spy-price-old">$' +
          p.oldPrice.toFixed(2) +
          '</span><span>' +
          (isDown ? '\u2193' : '\u2191') +
          '</span><span style="color:' +
          (isDown ? 'var(--accent-green)' : 'var(--accent-red)') +
          '">$' +
          p.newPrice.toFixed(2) +
          '</span></div>';
      });
      h += '</div></div>';
    }

    h +=
      '<div class="spy-profile-section"><h4><span>&#128736;</span> Tech Stack</h4><div class="spy-profile-apps">' +
      s.apps
        .map(function (a) {
          return '<span class="spy-tech-app">' + a + '</span>';
        })
        .join('') +
      '</div></div>';

    h +=
      '<div class="spy-profile-section"><h4><span>&#128241;</span> Social Following</h4><div class="spy-profile-social">' +
      '<div class="spy-social-item"><span class="spy-social-icon fb">f</span><span class="spy-social-val">' +
      fmtNum(s.socialFB) +
      '</span></div>' +
      '<div class="spy-social-item"><span class="spy-social-icon ig">\u25CE</span><span class="spy-social-val">' +
      fmtNum(s.socialIG) +
      '</span></div>' +
      '<div class="spy-social-item"><span class="spy-social-icon tk">\u266A</span><span class="spy-social-val">' +
      fmtNum(s.socialTK) +
      '</span></div>' +
      '</div></div>';
    h += '</div>';

    h += '<div>';
    h +=
      '<div class="spy-profile-section"><h4><span>&#127760;</span> Traffic Sources</h4><div class="spy-profile-traffic">';
    const srcs = s.trafficSources;
    ['direct', 'organic', 'paid', 'social', 'referral'].forEach(function (k) {
      h +=
        '<div class="spy-profile-traffic-row"><span>' +
        k.charAt(0).toUpperCase() +
        k.slice(1) +
        '</span><div class="spy-traffic-source-bar"><div class="spy-traffic-source-fill" style="width:' +
        srcs[k] +
        '%"></div></div><span>' +
        srcs[k] +
        '%</span></div>';
    });
    h += '</div></div>';

    h +=
      '<div class="spy-profile-section"><h4><span>&#128202;</span> Performance Metrics</h4><div class="spy-profile-perf">' +
      '<div class="spy-profile-perf-row"><span>Page Speed</span><span style="color:var(--accent-cyan)">' +
      s.pageSpeed +
      '/100</span></div>' +
      '<div class="spy-profile-perf-row"><span>SEO Score</span><span style="color:var(--accent-cyan)">' +
      s.seoScore +
      '/100</span></div>' +
      '<div class="spy-profile-perf-row"><span>Bounce Rate</span><span style="color:var(--accent-orange)">' +
      s.bounceRate +
      '%</span></div>' +
      '<div class="spy-profile-perf-row"><span>Avg Session</span><span>' +
      s.avgSession +
      '</span></div>' +
      '<div class="spy-profile-perf-row"><span>Refund Rate</span><span style="color:var(--accent-red)">' +
      s.refundRate +
      '%</span></div>' +
      '</div></div>';

    h +=
      '<div class="spy-profile-section"><h4><span>&#128100;</span> Audience Insights</h4><div class="spy-profile-perf">' +
      '<div class="spy-profile-perf-row"><span>Top Country</span><span style="color:var(--accent-cyan)">United States (42%)</span></div>' +
      '<div class="spy-profile-perf-row"><span>Age Group</span><span>25-34</span></div>' +
      '<div class="spy-profile-perf-row"><span>Gender Split</span><span>60% F / 40% M</span></div>' +
      '<div class="spy-profile-perf-row"><span>Returning Visitors</span><span style="color:var(--accent-green)">34%</span></div>' +
      '</div></div>';
    h += '</div>';

    h += '</div>';

    h += '</div></div>';
    container.innerHTML = h;

    const closeBtn = container.querySelector('#spyProfileClose');
    const overlay = container.querySelector('#spyProfileOverlay');
    function closeProfile() {
      container.innerHTML = '';
    }
    if (closeBtn) closeBtn.addEventListener('click', closeProfile);
    if (overlay) overlay.addEventListener('click', closeProfile);
  }

  function updateLive() {
    const dots = _section.querySelectorAll('.spy-lb-dot');
    dots.forEach(function (d) {
      d.style.opacity = d.style.opacity === '0.3' ? '1' : '0.3';
    });
  }

  const SpyCenterPlugin = {
    id: 'spy-center',
    name: 'Store Spy Center',
    version: '2.0.0',
    description: 'Full-stack store intelligence - revenue, ads, tech stack, traffic & pricing',
    dependencies: ['search-engine'],

    init: function (_ctx) {
      Config.defaults('spyCenter', { enabled: true });
    },

    mount: function (_ctx) {
      const container = UI.$('sections-container');
      if (!container) return;

      const section = document.createElement('section');
      section.className = 'section section-spy';
      section.id = 'section-spy-center';

      const totalRevenue = STORES.reduce(function (a, s) {
        return a + s.revenue;
      }, 0);
      const totalProducts = STORES.reduce(function (a, s) {
        return a + s.products;
      }, 0);
      const avgConv = (
        STORES.reduce(function (a, s) {
          return a + s.convRate;
        }, 0) / STORES.length
      ).toFixed(1);

      section.innerHTML =
        '' +
        '<div class="section-inner">' +
        '<div class="section-header">' +
        '<h2 class="section-title">Store Spy Center</h2>' +
        '<p class="section-desc">Full-stack store intelligence - revenue, ads, tech stack, traffic & pricing analysis</p>' +
        '</div>' +
        '<div class="spy-input-area">' +
        '<div class="ai-search-box">' +
        '<input type="text" id="spyInput" placeholder="Enter store URL (e.g., store.myshopify.com)">' +
        '<button class="ai-analyze-btn spy-btn" id="spyBtn"><span class="ai-sparkle">&#128270;</span> Spy on Store</button>' +
        '</div>' +
        '<div class="spy-quick-picks">' +
        '<span class="spy-quick-label">Quick spy:</span>' +
        '<button class="spy-quick-btn" data-store="s1">PetLover</button>' +
        '<button class="spy-quick-btn" data-store="s3">BeautyGlow</button>' +
        '<button class="spy-quick-btn" data-store="s10">StarLight</button>' +
        '<button class="spy-quick-btn" data-store="s6">Kawaii Decor</button>' +
        '<button class="spy-quick-btn" data-store="s9">PostureTech</button>' +
        '</div>' +
        '</div>' +
        '<div class="spy-overview">' +
        '<div class="spy-ov-card"><div class="spy-ov-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">&#127978;</div><div class="spy-ov-info"><div class="spy-ov-value">' +
        STORES.length +
        '</div><div class="spy-ov-label">Stores Tracked</div></div></div>' +
        '<div class="spy-ov-card"><div class="spy-ov-icon" style="background:var(--accent-green-dim);color:var(--accent-green)">&#128176;</div><div class="spy-ov-info"><div class="spy-ov-value">' +
        fmtMoney(totalRevenue) +
        '</div><div class="spy-ov-label">Combined Revenue</div></div></div>' +
        '<div class="spy-ov-card"><div class="spy-ov-icon" style="background:var(--accent-orange-dim);color:var(--accent-orange)">&#128230;</div><div class="spy-ov-info"><div class="spy-ov-value">' +
        totalProducts +
        '</div><div class="spy-ov-label">Total Products</div></div></div>' +
        '<div class="spy-ov-card"><div class="spy-ov-icon" style="background:rgba(236,72,153,0.12);color:var(--accent-pink)">&#128200;</div><div class="spy-ov-info"><div class="spy-ov-value">' +
        avgConv +
        '%</div><div class="spy-ov-label">Avg Conversion</div></div></div>' +
        '<div class="spy-ov-card"><div class="spy-ov-icon" style="background:rgba(251,191,36,0.12);color:var(--accent-yellow)">&#127919;</div><div class="spy-ov-info"><div class="spy-ov-value">' +
        STORE_ADS.length +
        '</div><div class="spy-ov-label">Active Ads</div></div></div>' +
        '<div class="spy-ov-card"><div class="spy-ov-icon" style="background:rgba(168,85,247,0.12);color:var(--accent-purple)">&#9889;</div><div class="spy-ov-info"><div class="spy-ov-value">' +
        NEW_PRODUCTS.length +
        '</div><div class="spy-ov-label">New Products</div></div></div>' +
        '</div>' +
        '<div class="spy-tabs">' +
        '<button class="spy-tab active" data-tab="leaderboard">Leaderboard</button>' +
        '<button class="spy-tab" data-tab="ads">Ad Intelligence (' +
        STORE_ADS.length +
        ')</button>' +
        '<button class="spy-tab" data-tab="pricing">Pricing Intel</button>' +
        '<button class="spy-tab" data-tab="techstack">Tech Stack</button>' +
        '<button class="spy-tab" data-tab="traffic">Traffic &amp; SEO</button>' +
        '<button class="spy-tab" data-tab="newproducts">New Products (' +
        NEW_PRODUCTS.length +
        ')</button>' +
        '<button class="spy-tab" data-tab="revenue">Revenue Chart</button>' +
        '</div>' +
        '<div class="spy-tab-content" id="spyTabContent"></div>' +
        '<div id="spyProfileContainer"></div>' +
        window.HuntDrop.renderRelatedTools([
          {
            section: 'section-battlefield',
            name: 'Competitor Battlefield',
            desc: 'Live competitive intel',
            icon: '&#9876;',
            color: '#FF6B6B',
          },
          {
            section: 'section-ai-analyst',
            name: 'AI Analyst',
            desc: 'Deep product analysis',
            icon: '&#129504;',
            color: '#4ECDC4',
          },
          {
            section: 'section-niche-radar',
            name: 'Niche Radar',
            desc: 'Track niche trends',
            icon: '&#128225;',
            color: '#45B7D1',
          },
          {
            section: 'section-lifecycle',
            name: 'Product Lifecycle',
            desc: 'Monitor maturity',
            icon: '&#128202;',
            color: '#96CEB4',
          },
        ]) +
        '</div>';

      container.appendChild(section);
      _section = section;
      renderTab('leaderboard');

      _liveInterval = setInterval(function () {
        updateLive();
      }, 5000);

      section.querySelectorAll('.spy-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
          section.querySelectorAll('.spy-tab').forEach(function (t) {
            t.classList.remove('active');
          });
          tab.classList.add('active');
          renderTab(tab.dataset.tab);
        });
      });

      section.querySelectorAll('.spy-quick-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          showStoreProfile(btn.dataset.store);
        });
      });

      const spyBtn = section.querySelector('#spyBtn');
      if (spyBtn)
        spyBtn.addEventListener('click', function () {
          const url = (section.querySelector('#spyInput')?.value || '').trim();
          if (!url) return;
          const match = STORES.find(function (s) {
            return url.toLowerCase().indexOf(s.url.split('.')[0].toLowerCase()) > -1;
          });
          if (match) {
            showStoreProfile(match.id);
          } else {
            UI.toast('Store not found. Showing top store.', 'info', 3000);
            showStoreProfile(STORES[0].id);
          }
        });
    },

    unmount: function (_ctx) {
      if (_liveInterval) clearInterval(_liveInterval);
      if (_revenueChart) {
        try {
          _revenueChart.destroy();
        } catch {
          /* ignored */
        }
        _revenueChart = null;
      }
      const el = UI.$('section-spy-center');
      if (el) el.remove();
    },
  };

  PluginRegistry.register('spy-center', SpyCenterPlugin);
})();

/* ===================================================================
   ROUTER — SPA Navigation Between Unified Pages
   =================================================================== */

(function() {
  'use strict';

  const { EventBus, UI, Config } = window.HuntDrop;

  // ===== Route Definitions =====
  const routes = {
    'dashboard': {
      title: 'Dashboard',
      icon: '🏠',
      section: 'section-dashboard'
    },
    'product-finder': {
      title: 'Find Products',
      icon: '🔍',
      section: 'section-product-finder',
      breadcrumb: ['Dashboard', 'Find Products']
    },
    'profit-hub': {
      title: 'Profit Calculator',
      icon: '💰',
      section: 'section-profit-hub',
      breadcrumb: ['Dashboard', 'Profit Hub']
    },
    'supplier-center': {
      title: 'Find Suppliers',
      icon: '🏭',
      section: 'section-supplier-center',
      breadcrumb: ['Dashboard', 'Supplier Center']
    },
    'competitor-intel': {
      title: 'Competitor Spy',
      icon: '🕵️',
      section: 'section-competitor-intel',
      breadcrumb: ['Dashboard', 'Competitor Intel']
    },
    'marketing-hub': {
      title: 'Marketing',
      icon: '📢',
      section: 'section-marketing-hub',
      breadcrumb: ['Dashboard', 'Marketing Hub']
    },
    'store-builder': {
      title: 'Store Builder',
      icon: '🏪',
      section: 'section-store-builder',
      breadcrumb: ['Dashboard', 'Store Builder']
    },
    'ai-coach': {
      title: 'AI Coach',
      icon: '🧠',
      section: 'section-ai-coach',
      breadcrumb: ['Dashboard', 'AI Coach']
    }
  };

  let currentRoute = 'dashboard';
  let routeHistory = ['dashboard'];

  // ===== Initialize Router =====
  function initRouter() {
    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.route) {
        navigateToRoute(e.state.route, false);
      }
    });

    // Check URL hash on load
    const hash = window.location.hash.replace('#', '');
    if (hash && routes[hash]) {
      navigateToRoute(hash, false);
    }
  }

  // ===== Navigate to Route =====
  function navigateToRoute(routeName, pushState = true) {
    if (!routes[routeName]) return;

    const route = routes[routeName];
    const sections = document.querySelectorAll('.section');
    
    // Hide all sections
    sections.forEach(s => s.classList.remove('active'));

    // Show target section
    const targetSection = document.getElementById(route.section);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Update history
    if (pushState) {
      window.history.pushState({ route: routeName }, '', '#' + routeName);
      routeHistory.push(routeName);
    }

    currentRoute = routeName;

    // Update navigation active states
    updateNavActive(routeName);

    // Update back button
    updateBackButton();

    // Emit route change event
    EventBus.emit('route:changed', { route: routeName, ...route });

    // Scroll to top
    window.scrollTo(0, 0);
  }

  // ===== Update Nav Active States =====
  function updateNavActive(routeName) {
    // Update sidebar items
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.classList.remove('active');
    });

    // Update quick tools cards
    document.querySelectorAll('.qt-card').forEach(card => {
      card.classList.remove('active');
    });

    // Mark matching items as active
    const route = routes[routeName];
    if (route) {
      document.querySelectorAll(`[data-route="${routeName}"]`).forEach(el => {
        el.classList.add('active');
      });
    }
  }

  // ===== Update Back Button =====
  function updateBackButton() {
    const backBtn = document.getElementById('navBackBtn');
    if (backBtn) {
      if (currentRoute !== 'dashboard') {
        backBtn.style.display = 'flex';
      } else {
        backBtn.style.display = 'none';
      }
    }
  }

  // ===== Go Back =====
  function goBack() {
    if (routeHistory.length > 1) {
      routeHistory.pop(); // Remove current
      const previousRoute = routeHistory[routeHistory.length - 1];
      navigateToRoute(previousRoute, true);
    } else {
      navigateToRoute('dashboard', true);
    }
  }

  // ===== Public API =====
  window.HuntDrop = window.HuntDrop || {};
  window.HuntDrop.Router = {
    init: initRouter,
    navigate: navigateToRoute,
    goBack: goBack,
    getCurrentRoute: () => currentRoute,
    getRoutes: () => routes
  };

  // Also expose as navigateTo for backward compatibility
  window.HuntDrop.navigateTo = function(sectionId) {
    // Map old section IDs to new routes
    const sectionToRoute = {
      'section-dashboard': 'dashboard',
      'section-product-finder': 'product-finder',
      'section-profit-hub': 'profit-hub',
      'section-supplier-center': 'supplier-center',
      'section-competitor-intel': 'competitor-intel',
      'section-marketing-hub': 'marketing-hub',
      'section-store-builder': 'store-builder',
      'section-ai-coach': 'ai-coach'
    };

    const route = sectionToRoute[sectionId] || 'dashboard';
    navigateToRoute(route);
  };

  window.HuntDrop.goBack = goBack;

})();
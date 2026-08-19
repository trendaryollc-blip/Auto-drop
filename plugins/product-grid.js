// ============================================================================
// PLUGIN: Product Grid UI
// ============================================================================
// Renders the product cards in the search results page.
// ============================================================================
(function () {
  const { EventBus, UI } = window.HuntDrop;
  const esc = UI.escapeHtml;
  const PAGE_SIZE = 24;
  let _allResults = [];
  let _visibleCount = 0;
  let _cleanups = [];

  function parseOrders(v) {
    if (v == null || v === '') return 0;
    const s = String(v).replace(/,/g, '').trim();
    const m = s.match(/^(\d+(?:\.\d+)?)\s*([kKmM]?)$/);
    if (!m) return 0;
    const n = parseFloat(m[1]);
    const suffix = m[2].toLowerCase();
    return suffix === 'k' ? n * 1000 : suffix === 'm' ? n * 1000000 : n;
  }

  function renderCard(p) {
    if (!p) return '';
    const score = p.score || 0;
    const scoreClass = score >= 85 ? 'score-excellent' : score >= 70 ? 'score-good' : 'score-fair';
    const comp = p.competition || 'medium';
    const compColor =
      { low: 'var(--accent-green)', medium: 'var(--accent-yellow)', high: 'var(--accent-red)' }[comp] ||
      'var(--accent-yellow)';
    const compBar = { low: 'green', medium: 'orange', high: 'red' }[comp] || 'orange';
    const compW = { low: '30', medium: '60', high: '90' }[comp] || '60';
    const cap = function (s) {
      return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
    };
    const fmtN = function (n) {
      return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n.toString();
    };
    const badges = (p.badges || [])
      .map(function (b) {
        const safe = esc(b);
        const cls = safe.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '');
        return '<span class="badge badge-' + cls + '">' + (b === 'ai' ? 'AI' : safe) + '</span>';
      })
      .join('');
    const supplierName = esc(p.suppliers && p.suppliers[0] ? p.suppliers[0].name : 'N/A');
    const supplierVerified = p.suppliers && p.suppliers[0] && p.suppliers[0].verified;
    let imgAttrs = {};
    try {
      imgAttrs = UI.getOptimizedImageAttributes
        ? UI.getOptimizedImageAttributes(p.image || '', title, {
            sizes: '(max-width: 768px) 100vw, 33vw',
            fetchpriority: 'high',
          })
        : { src: p.image || '' };
    } catch (e) {
      imgAttrs = { src: p.image || '' };
    }
    const img = esc(imgAttrs.src || '');
    const srcsetAttr = imgAttrs.srcset ? ' srcset="' + esc(imgAttrs.srcset) + '"' : '';
    const sizesAttr = imgAttrs.sizes ? ' sizes="' + esc(imgAttrs.sizes) + '"' : '';
    const fetchPrio = imgAttrs.fetchpriority || 'low';
    const title = esc(p.title || 'Unknown Product');
    const margin = p.margin || 0;
    const marginClass = margin >= 50 ? 'margin-high' : margin >= 30 ? 'margin-med' : 'margin-low';

    const images = p.images || [];
    const thumbCount = Math.min(images.length, 4);
    const overflow = images.length > 4 ? images.length - 4 : 0;

    let thumbsHtml = '';
    for (let i = 0; i < thumbCount; i++) {
      const isActive = i === 0;
      thumbsHtml +=
        '<img src="' +
        esc(UI.normalizeImageUrl ? UI.normalizeImageUrl(images[i], '') : images[i]) +
        '" class="card-thumb' +
        (isActive ? ' active' : '') +
        '" data-idx="' +
        i +
        '" alt="">';
    }
    if (overflow > 0) {
      thumbsHtml +=
        '<div class="card-thumb card-thumb-overflow" data-idx="4" title="' +
        images.length +
        ' images total">+' +
        overflow +
        '</div>';
    }

    const selectCb = '';
    return (
      '<div class="product-card" data-product-id="' +
      esc(String(p.id)) +
      '">' +
      '<div class="card-image">' +
      '<img src="' +
      img +
      '"' +
      ' alt="' +
      title +
      '" data-product-id="' +
      esc(String(p.id)) +
      '" loading="' +
      esc(imgAttrs.loading || 'lazy') +
      '" decoding="' +
      esc(imgAttrs.decoding || 'async') +
      '" fetchpriority="' +
      esc(fetchPrio) +
      '"' +
      srcsetAttr +
      sizesAttr +
      '>' +
      '<div class="card-img-loading" data-img-loading="' +
      esc(String(p.id)) +
      '"><div class="card-img-spinner"></div></div>' +
      '<div class="card-badges">' +
      badges +
      '</div>' +
      '<div class="card-score ' +
      scoreClass +
      '">' +
      score +
      '</div>' +
      '<div class="card-platform platform-' +
      esc(p.platform || 'unknown') +
      '"><span class="platform-dot"></span>' +
      esc(cap(p.platform)) +
      '</div>' +
      selectCb +
      '</div>' +
      (images.length > 1 ? '<div class="card-thumbnails">' + thumbsHtml + '</div>' : '') +
      '<div class="card-body">' +
      '<h3 class="card-title">' +
      title +
      '</h3>' +
      '<div class="card-prices">' +
      '<span class="price-current">$' +
      (p.price || 0).toFixed(2) +
      '</span>' +
      '<span class="price-original">$' +
      (p.originalPrice || 0).toFixed(2) +
      '</span>' +
      '<span class="price-margin ' +
      marginClass +
      '">' +
      margin +
      '%</span>' +
      '</div>' +
      '<div class="card-metrics">' +
      '<div class="metric"><span class="metric-label">Sales/mo</span><span class="metric-value">' +
      fmtN(p.salesVelocity || 0) +
      '</span><div class="metric-bar"><div class="metric-bar-fill bar-green" style="width:' +
      Math.min((p.salesVelocity || 0) / 92, 100) +
      '%"></div></div></div>' +
      '<div class="metric"><span class="metric-label">Competition</span><span class="metric-value" style="color:' +
      compColor +
      '">' +
      cap(comp) +
      '</span><div class="metric-bar"><div class="metric-bar-fill bar-' +
      compBar +
      '" style="width:' +
      compW +
      '%"></div></div></div>' +
      '<div class="metric"><span class="metric-label">Demand</span><span class="metric-value">' +
      (p.demand || 0) +
      '/100</span><div class="metric-bar"><div class="metric-bar-fill bar-cyan" style="width:' +
      Math.min(p.demand || 0, 100) +
      '%"></div></div></div>' +
      '<div class="metric"><span class="metric-label">Orders</span><span class="metric-value">' +
      fmtN(p.orders || 0) +
      '</span><div class="metric-bar"><div class="metric-bar-fill bar-purple" style="width:' +
      Math.min(parseOrders(p.orders) / 32, 100) +
      '%"></div></div></div>' +
      '</div>' +
      '</div>' +
      '<div class="card-footer">' +
      '<div class="card-supplier"><span class="supplier-dot"></span>' +
      supplierName +
      (supplierVerified ? ' <span class="supplier-verified">&#10003;</span>' : '') +
      '</div>' +
      '<div class="card-footer-actions">' +
      '<button class="card-action card-action-push" data-action="push-single" data-id="' +
      p.id +
      '">&#x1F4E6; Push</button>' +
      '<button class="card-action" data-action="analyze" data-id="' +
      p.id +
      '">Full Analysis</button>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  function cap(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  function bindCardClicks(grid) {
    if (!grid) return;
    grid.querySelectorAll('.product-card').forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('.card-action[data-action="push-single"]')) {
          e.stopPropagation();
          var pid = card.dataset.productId;
          if (pid && window.HuntDrop.pushProductToStore) {
            window.HuntDrop.pushProductToStore(pid);
          } else if (pid) {
            var stores = [];
            try { stores = JSON.parse(localStorage.getItem('sc_connected_stores') || '[]'); } catch (ex) {}
            if (!stores.length) {
              window.HuntDrop.UI.toast('Connect a store first in Store Connect', 'error');
              return;
            }
            var allProds = window.HuntDrop.ALL_PRODUCTS || [];
            var prod = allProds.find(function (p) { return String(p.id) === String(pid); });
            if (!prod) return;
            var store = stores[0];
            var payload = [{
              title: prod.title, price: prod.price, description: prod.aiInsight || prod.title,
              images: prod.images && prod.images.length ? prod.images : (prod.image ? [prod.image] : []),
              inventory: 100, sku: 'HD-' + prod.id, category: prod.category || '', tags: prod.keywords || []
            }];
            fetch(store.url + '/api/products/ingest', {
              method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': store.auth && store.auth.apiKey ? store.auth.apiKey : '' },
              body: JSON.stringify(payload)
            }).then(function (r) { return r.json(); }).then(function () {
              var st = JSON.parse(localStorage.getItem('sc_connected_stores') || '[]');
              var s = st.find(function (x) { return x.id === store.id; });
              if (s) { s.productsPushed = (s.productsPushed || 0) + 1; s.lastSync = new Date().toISOString(); localStorage.setItem('sc_connected_stores', JSON.stringify(st)); }
              window.HuntDrop.UI.toast(prod.title + ' pushed to ' + store.name + '!', 'success');
            }).catch(function (err) {
              window.HuntDrop.UI.toast('Push failed: ' + (err.message || 'Unknown error'), 'error');
            });
          }
          return;
        }
        if (e.target.closest('.card-action')) return;

        const thumb = e.target.closest('.card-thumb');
        if (thumb) {
          e.stopPropagation();
          const imgEl = card.querySelector('.card-image img');
          const allThumbs = card.querySelectorAll('.card-thumb');
          const idx = parseInt(thumb.dataset.idx || '0', 10);
          if (imgEl) {
            const imgs = card._images || [];
            const safe = esc(UI.normalizeImageUrl ? UI.normalizeImageUrl(imgs[idx], '') : imgs[idx] || '');
            imgEl.src = safe;
          }
          allThumbs.forEach(function (t) {
            t.classList.remove('active');
          });
          thumb.classList.add('active');
          return;
        }
        const mainImg = e.target.closest('.card-image img');
        if (mainImg) {
          const imgs = card._images || [];
          if (imgs.length > 1) {
            e.stopPropagation();
            openProductGridLightbox(card, imgs);
            return;
          }
        }
        const id = card.dataset.productId;
        if (id) {
          window.HuntDrop._currentProductId = id;
          EventBus.emit('product:analyze', { id: id });
        }
      });
    });
  }

  function openProductGridLightbox(card, images) {
    let lb = document.getElementById('pgImageLightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.id = 'pgImageLightbox';
      lb.className = 'pg-image-lightbox';
      lb.innerHTML =
        '<button class="pg-lb-close" title="Close (Esc)">&times;</button>' +
        '<button class="pg-lb-nav pg-lb-prev" title="Previous">&#10094;</button>' +
        '<button class="pg-lb-nav pg-lb-next" title="Next">&#10095;</button>' +
        '<div class="pg-lb-img-wrap"><img class="pg-lb-img" src="" alt=""></div>' +
        '<div class="pg-lb-counter"></div>';
      document.body.appendChild(lb);
      lb.addEventListener('click', function (e) {
        if (e.target === lb || e.target.classList.contains('pg-lb-close')) {
          closeProductGridLightbox();
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && lb && lb.classList.contains('active')) {
          closeProductGridLightbox();
        }
      });
    }
    if (!card._lbImages) {
      card._lbImages = images;
    }
    const imgs = card._lbImages;
    let idx = 0;
    const img = lb.querySelector('.pg-lb-img');
    const counter = lb.querySelector('.pg-lb-counter');
    function show(i) {
      idx = (i + imgs.length) % imgs.length;
      img.src = esc(UI.normalizeImageUrl ? UI.normalizeImageUrl(imgs[idx], '') : imgs[idx]);
      if (counter) counter.textContent = idx + 1 + ' / ' + imgs.length;
    }
    show(0);
    lb.querySelector('.pg-lb-prev').onclick = function (e) {
      e.stopPropagation();
      show(idx - 1);
    };
    lb.querySelector('.pg-lb-next').onclick = function (e) {
      e.stopPropagation();
      show(idx + 1);
    };
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
    window._pgLightbox = lb;
  }
  function closeProductGridLightbox() {
    const lb = window._pgLightbox;
    if (!lb) return;
    lb.classList.remove('active');
    document.body.style.overflow = '';
  }



  function setEmptyState(mode, title, description) {
    const empty = document.getElementById('productsEmpty');
    const titleEl = document.getElementById('srEmptyTitle');
    const descEl = document.getElementById('srEmptyDesc');
    const grid = document.getElementById('productsGrid');
    const finalTitle = title || 'No products found';
    const finalDescription = description || 'Try adjusting your filters or search for something different.';

    if (empty) {
      empty.classList.add('visible');
      empty.setAttribute('aria-live', 'polite');
      if (!titleEl || !descEl) {
        empty.innerHTML = [
          '<div class="sr-empty-icon">',
          '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">',
          '<circle cx="11" cy="11" r="8" />',
          '<line x1="21" y1="21" x2="16.65" y2="16.65" />',
          '<line x1="8" y1="11" x2="14" y2="11" />',
          '</svg>',
          '</div>',
          '<h3 class="sr-empty-title" id="srEmptyTitle">' + esc(finalTitle) + '</h3>',
          '<p class="sr-empty-desc" id="srEmptyDesc">' + esc(finalDescription) + '</p>',
          '<div class="sr-empty-suggestions">',
          '<h4>Popular Searches</h4>',
          '<div class="sr-empty-grid">',
          '<div class="sr-empty-card" data-query="wireless earbuds"><span>🎧</span><span>Wireless Earbuds</span></div>',
          '<div class="sr-empty-card" data-query="pet gadgets"><span>🐶</span><span>Pet Gadgets</span></div>',
          '<div class="sr-empty-card" data-query="kitchen organizer"><span>🍽️</span><span>Kitchen Organizer</span></div>',
          '<div class="sr-empty-card" data-query="LED strip lights"><span>💡</span><span>LED Strip Lights</span></div>',
          '<div class="sr-empty-card" data-query="phone accessories"><span>📱</span><span>Phone Accessories</span></div>',
          '<div class="sr-empty-card" data-query="fitness gadget"><span>💪</span><span>Fitness Gadget</span></div>',
          '</div>',
          '</div>',
        ].join('');
      } else {
        titleEl.textContent = finalTitle;
        descEl.textContent = finalDescription;
      }
    }
    if (grid) grid.innerHTML = '';
  }

  function updateSummaryBar(results) {
    const total = results.length;
    let avgMargin = 0;
    let avgScore = 0;
    const platformCounts = {};
    let platformMax = 0;
    let topPlatform = '—';

    for (let i = 0; i < results.length; i++) {
      const p = results[i];
      avgMargin += p.margin || 0;
      avgScore += p.score || 0;
      const pl = p.platform || 'unknown';
      platformCounts[pl] = (platformCounts[pl] || 0) + 1;
      if (platformCounts[pl] > platformMax) {
        platformMax = platformCounts[pl];
        topPlatform = cap(pl);
      }
    }
    if (total > 0) {
      avgMargin = Math.round(avgMargin / total);
      avgScore = Math.round(avgScore / total);
    }

    const elTotal = document.getElementById('srTotalCount');
    const elMargin = document.getElementById('srAvgMargin');
    const elScore = document.getElementById('srAvgScore');
    const elPlatform = document.getElementById('srTopPlatform');
    if (elTotal) elTotal.textContent = total;
    if (elMargin) elMargin.textContent = avgMargin + '%';
    if (elScore) elScore.textContent = avgScore;
    if (elPlatform) elPlatform.textContent = topPlatform;
  }

  function updateActiveFilters(filters, query) {
    const chipsEl = document.getElementById('srFilterChips');
    if (!chipsEl) return;
    let html = '';

    if (query) {
      html +=
        '<span class="sr-af-chip">Search: "' +
        esc(query) +
        '" <button class="sr-af-chip-remove" data-clear="query">&times;</button></span>';
    }
    if (filters.platform && filters.platform !== 'all') {
      html +=
        '<span class="sr-af-chip">Platform: ' +
        esc(cap(filters.platform)) +
        ' <button class="sr-af-chip-remove" data-clear="platform">&times;</button></span>';
    }
    if (filters.margin && filters.margin !== 'all') {
      html +=
        '<span class="sr-af-chip">Margin: ' +
        esc(filters.margin) +
        '%+ <button class="sr-af-chip-remove" data-clear="margin">&times;</button></span>';
    }
    if (filters.competition && filters.competition !== 'all') {
      html +=
        '<span class="sr-af-chip">Competition: ' +
        esc(cap(filters.competition)) +
        ' <button class="sr-af-chip-remove" data-clear="competition">&times;</button></span>';
    }
    if (filters.minScore && filters.minScore > 0) {
      html +=
        '<span class="sr-af-chip">Score: ' +
        esc(filters.minScore) +
        '+ <button class="sr-af-chip-remove" data-clear="score">&times;</button></span>';
    }

    chipsEl.innerHTML = html;

    // Bind remove buttons
    chipsEl.querySelectorAll('.sr-af-chip-remove').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const clearType = btn.dataset.clear;
        if (clearType === 'query') {
          const input = UI.$('searchPageInput');
          if (input) input.value = '';
        } else if (clearType === 'platform') {
          const sel = UI.$('searchPagePlatform');
          if (sel) sel.value = 'all';
          const sel2 = document.getElementById('sortSelectSearch');
          if (sel2) sel2.value = 'all';
        } else if (clearType === 'margin') {
          document.querySelectorAll('.sr-pill[data-margin]').forEach(function (b) {
            b.classList.remove('active');
          });
          document.querySelector('.sr-pill[data-margin="all"]').classList.add('active');
        } else if (clearType === 'competition') {
          document.querySelectorAll('.sr-pill.comp-pill[data-comp]').forEach(function (b) {
            b.classList.remove('active');
          });
          document.querySelector('.sr-pill.comp-pill[data-comp="all"]').classList.add('active');
        } else if (clearType === 'score') {
          const sr = UI.$('scoreRange');
          const sv = UI.$('scoreValue');
          if (sr) sr.value = 0;
          if (sv) sv.textContent = '0';
        }
        EventBus.emit('filter:changed', {
          filters: window.HuntDrop._lastFilters || {},
          query: window.HuntDrop._lastQuery || '',
        });
      });
    });
  }

  const ProductGridPlugin = {
    id: 'product-grid',
    name: 'Product Grid',
    version: '4.0.0',
    description: 'Renders product cards in the search results page',

    init(_ctx) {},

    mount(_ctx) {
      const c = [];
      c.push(
        EventBus.on('search:results', function (data) {
          const grid = UI.$('productsGrid');
          const empty = document.getElementById('productsEmpty');
          if (empty) empty.classList.remove('visible');
          if (!grid) return;

          // Store all results and reset visible count
          _allResults = data.results || [];
          _visibleCount = Math.min(PAGE_SIZE, _allResults.length);
          window.HuntDrop.ALL_PRODUCTS = _allResults;
          window.HuntDrop.ALL_PRODUCTS_META = {
            query: data.query || '',
            source: 'Search Results',
            timestamp: Date.now(),
          };

          if (!_allResults.length) {
            const query = data && data.query ? String(data.query).trim() : '';
            const title = query ? 'No matches for “' + query + '”' : 'No products found';
            const desc = query
              ? 'Try a broader search, lower the minimum score, or switch to another platform.'
              : 'Try adjusting your filters or search for something different.';
            setEmptyState('empty', title, desc);
            return;
          }

          let html = '';
          for (let i = 0; i < _visibleCount; i++) {
            html += renderCard(_allResults[i]);
          }

          // Add "Load More" button if there are more results
          if (_visibleCount < _allResults.length) {
            html +=
              '<div class="pg-load-more-container" style="grid-column:1/-1;text-align:center;padding:20px 0">' +
              '<button id="pgLoadMore" class="pg-load-more-btn" style="padding:12px 32px;border:1px solid rgba(0,255,136,0.3);border-radius:8px;background:rgba(0,255,136,0.08);color:var(--accent-green);font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s">' +
              'Show More (' +
              _visibleCount +
              ' of ' +
              _allResults.length +
              ')' +
              '</button></div>';
          }

          grid.innerHTML = html;

          // Attach images arrays to card DOM nodes for thumbnail/lightbox
          _allResults.forEach(function (p, idx) {
            const card = grid.querySelector('.product-card[data-product-id="' + esc(String(p.id)) + '"]');
            if (card) card._images = p.images || [];
          });

          // Bind Load More button (capture snapshot of results to prevent stale closure)
          const loadMoreSnapshot = data.results || [];
          const loadMoreSnapshotLen = loadMoreSnapshot.length;
          const loadMoreBtn = document.getElementById('pgLoadMore');
          if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', function loadMoreHandler() {
              // Guard: if _allResults changed since button was rendered, use current
              const currentResults = _allResults;
              const currentLen = currentResults.length;
              _visibleCount = Math.min(_visibleCount + PAGE_SIZE, currentLen);
              let moreHtml = '';
              for (let j = 0; j < _visibleCount; j++) {
                moreHtml += renderCard(currentResults[j]);
              }
              if (_visibleCount < currentLen) {
                moreHtml +=
                  '<div class="pg-load-more-container" style="grid-column:1/-1;text-align:center;padding:20px 0">' +
                  '<button id="pgLoadMore" class="pg-load-more-btn" style="padding:12px 32px;border:1px solid rgba(0,255,136,0.3);border-radius:8px;background:rgba(0,255,136,0.08);color:var(--accent-green);font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s">' +
                  'Show More (' +
                  _visibleCount +
                  ' of ' +
                  currentLen +
                  ')' +
                  '</button></div>';
              }
              grid.innerHTML = moreHtml;
              bindCardClicks(grid);
              const newLoadMore = document.getElementById('pgLoadMore');
              if (newLoadMore) {
                newLoadMore.addEventListener('click', loadMoreHandler);
              }
            });
          }

          // Force multi-column grid layout inline so it cannot be overridden by CSS cascade
          grid.style.removeProperty('display');
          grid.style.removeProperty('grid-template-columns');
          grid.style.removeProperty('gap');
          grid.classList.remove('list-view');

          bindCardClicks(grid);

          const countEl = UI.$('resultsCount');
          if (countEl) countEl.textContent = data.total.toLocaleString() + ' products found';

          // Update summary bar
          updateSummaryBar(data.results);

          // Store for filter chip removal
          window.HuntDrop._lastFilters = data.filters || {};
          window.HuntDrop._lastQuery = data.query || '';
        })
      );

      c.push(
        EventBus.on('search:error', function (data) {
          const query = data && data.query ? String(data.query).trim() : '';
          const title = 'Search failed';
          const desc = query
            ? 'Search failed while looking for “' + query + '”. Please retry or try a simpler query.'
            : 'Search failed. Please retry or adjust your filters.';
          setEmptyState('error', title, desc);
        })
      );

      c.push(
        EventBus.on('filter:changed', function (data) {
          if (data) {
            updateActiveFilters(data.filters || {}, data.query || '');
          }
        })
      );

      c.push(
        EventBus.on('images:fetched', function (data) {
          if (!data || !data.updated) return;
          var grid = UI.$('productsGrid');
          if (!grid) return;
          Object.keys(data.updated).forEach(function (id) {
            var imgUrls = data.updated[id];
            if (!Array.isArray(imgUrls)) return;
            var imgEl = grid.querySelector('img[data-product-id="' + id + '"]');
            var card = grid.querySelector('.product-card[data-product-id="' + id + '"]');
            if (imgEl && imgUrls.length > 0) {
              imgEl.onerror = function () {
                this.style.display = 'none';
                var loading = grid.querySelector('[data-img-loading="' + id + '"]');
                if (loading) loading.style.display = 'none';
              };
              imgEl.onload = function () {
                var loading = grid.querySelector('[data-img-loading="' + id + '"]');
                if (loading) loading.style.display = 'none';
                this.style.opacity = '1';
              };
              imgEl.style.opacity = '0.5';
              var loadingEl = grid.querySelector('[data-img-loading="' + id + '"]');
              if (loadingEl) loadingEl.style.display = 'flex';
              // Use optimized attributes when available
              var opt = {};
              try {
                opt = UI.getOptimizedImageAttributes
                  ? UI.getOptimizedImageAttributes(imgUrls[0], '', {
                      sizes: '(max-width: 768px) 100vw, 33vw',
                      fetchpriority: 'high',
                    })
                  : { src: imgUrls[0] };
              } catch (e) {
                opt = { src: imgUrls[0] };
              }
              if (opt.srcset) imgEl.setAttribute('srcset', opt.srcset);
              if (opt.sizes) imgEl.setAttribute('sizes', opt.sizes);
              imgEl.setAttribute('fetchpriority', opt.fetchpriority || 'high');
              imgEl.src = esc(opt.src || imgUrls[0]);
              if (card) card._images = imgUrls;
            }
          });
        })
      );


      _cleanups = c;

      // View toggle (grid/list)
      const viewToggle = document.getElementById('srViewToggle');
      if (viewToggle) {
        viewToggle.addEventListener('click', function (e) {
          const btn = e.target.closest('.sr-view-btn');
          if (!btn) return;
          viewToggle.querySelectorAll('.sr-view-btn').forEach(function (b) {
            b.classList.remove('active');
          });
          btn.classList.add('active');
          const grid = UI.$('productsGrid');
          if (!grid) return;
          const isList = btn.dataset.view === 'list';
          grid.classList.toggle('list-view', isList);
        });
      }

      // Empty suggestion cards
      const emptyCards = document.querySelectorAll('.sr-empty-card');
      emptyCards.forEach(function (card) {
        card.addEventListener('click', function () {
          const query = card.dataset.query;
          if (query) {
            const input = UI.$('searchPageInput') || UI.$('searchInput');
            if (input) input.value = query;
            EventBus.emit('filter:changed', { filters: {}, query: query });
          }
        });
      });


    },

    unmount(_ctx) {
      (_cleanups || []).forEach(function (fn) {
        try {
          fn();
        } catch (e) {
          /* ignored */
        }
      });
      _cleanups = [];
    },
  };

  window.HuntDrop.PluginRegistry.register('product-grid', ProductGridPlugin);
})();

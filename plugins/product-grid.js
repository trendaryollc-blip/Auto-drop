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
    const img = esc(UI.normalizeImageUrl ? UI.normalizeImageUrl(p.image, '') : p.image || '');
    const title = esc(p.title || 'Unknown Product');
    const margin = p.margin || 0;
    const marginClass = margin >= 50 ? 'margin-high' : margin >= 30 ? 'margin-med' : 'margin-low';

    const selectCb =
      window.HuntDrop.StoreConnect && window.HuntDrop.StoreConnect.isSelectMode()
        ? '<input type="checkbox" class="sc-select-cb" data-sel-id="' +
          esc(String(p.id)) +
          '" style="position:absolute;top:8px;right:8px;z-index:5;width:20px;height:20px;cursor:pointer;accent-color:var(--accent-cyan)">'
        : '';
    return (
      '<div class="product-card" data-product-id="' +
      esc(String(p.id)) +
      '">' +
      '<div class="card-image">' +
      '<img src="' +
      img +
      '" alt="' +
      title +
      '" data-product-id="' +
      esc(String(p.id)) +
      '" loading="lazy" decoding="async" fetchpriority="low">' +
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
      '<button class="push-trendaryo-btn" data-push-id="' +
      p.id +
      '" title="Push to Trendaryo"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> Push to Store</button>' +
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
        if (e.target.closest('.card-action')) return;
        if (e.target.closest('.push-trendaryo-btn') || e.target.closest('.sc-select-cb')) return;
        const id = card.dataset.productId;
        if (id) {
          window.HuntDrop._currentProductId = id;
          EventBus.emit('product:analyze', { id: id });
        }
      });
    });
  }

  function bindPushButtons(grid) {
    if (!grid) return;
    grid.querySelectorAll('.push-trendaryo-btn').forEach(function (btn) {
      if (btn.dataset._bound) return;
      btn.dataset._bound = '1';
      btn.addEventListener('click', async function (e) {
        e.stopPropagation();
        const id = this.dataset.pushId;
        if (!id || !window.HuntDrop.StoreConnect) return;
        const p = _allResults.find(function (x) {
          return String(x.id) === String(id);
        });
        if (!p) return;
        const btnEl = this;
        btnEl.disabled = true;
        btnEl.innerHTML =
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-dasharray="31" stroke-dashoffset="31"><animate attributeName="stroke-dashoffset" values="31;0" dur="0.8s" repeatCount="indefinite"/></circle></svg> Pushing...';
        try {
          await window.HuntDrop.StoreConnect.pushProduct(p);
          btnEl.classList.add('push-success');
          btnEl.innerHTML = '&#10003; Pushed!';
          setTimeout(function () {
            btnEl.classList.remove('push-success');
            btnEl.innerHTML =
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> Push to Store';
            btnEl.disabled = false;
          }, 2500);
        } catch (e) {
          btnEl.innerHTML = '&#10007; Failed';
          setTimeout(function () {
            btnEl.innerHTML =
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> Push to Store';
            btnEl.disabled = false;
          }, 2500);
        }
      });
    });
    grid.querySelectorAll('.sc-select-cb').forEach(function (cb) {
      if (cb.dataset._bound) return;
      cb.dataset._bound = '1';
      cb.addEventListener('change', function () {
        if (window.HuntDrop.StoreConnect) {
          window.HuntDrop.StoreConnect.toggleProduct(this.dataset.selId);
        }
      });
    });
  }

  function updateBulkBar() {
    const bar = document.getElementById('scBulkBar');
    if (!bar) return;
    const sc = window.HuntDrop.StoreConnect;
    if (!sc) return;
    const active = sc.isSelectMode();
    bar.classList.toggle('active', active);
    if (active) {
      const count = sc.getSelectedProducts().length;
      bar.querySelector('.sc-bulk-count').textContent = count + ' selected';
    }
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
              bindPushButtons(grid);
              updateBulkBar();
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
            var imgUrl = data.updated[id];
            var imgEl = grid.querySelector('img[data-product-id="' + id + '"]');
            if (imgEl && imgUrl) {
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
              imgEl.src = imgUrl;
            }
          });
        })
      );

      c.push(
        EventBus.on('store:selectMode', function () {
          const grid = UI.$('productsGrid');
          if (!grid) return;
          let html = '';
          for (let i = 0; i < _visibleCount; i++) {
            html += renderCard(_allResults[i]);
          }
          if (_visibleCount < _allResults.length) {
            html +=
              '<div class="pg-load-more-container" style="grid-column:1/-1;text-align:center;padding:20px 0">' +
              '<button id="pgLoadMore" class="pg-load-more-btn" style="...">Show More (' +
              _visibleCount +
              ' of ' +
              _allResults.length +
              ')</button></div>';
          }
          grid.innerHTML = html;
          bindCardClicks(grid);
          bindPushButtons(grid);
          updateBulkBar();
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

      // Bulk push bar
      if (!document.getElementById('scBulkBar')) {
        const bar = document.createElement('div');
        bar.id = 'scBulkBar';
        bar.className = 'sc-bulk-bar';
        bar.innerHTML =
          '<span class="sc-bulk-count">0 selected</span>' +
          '<select class="sc-bulk-select" id="scBulkStatus"><option value="active">Active</option><option value="draft">Draft</option></select>' +
          '<button class="sc-bulk-push-btn" id="scBulkPushBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> Push to Trendaryo</button>' +
          '<button class="sc-bulk-close-btn" id="scBulkClose">Cancel</button>';
        document.body.appendChild(bar);

        document.getElementById('scBulkPushBtn')?.addEventListener('click', async function () {
          if (!window.HuntDrop.StoreConnect) return;
          const btn = this;
          const status = document.getElementById('scBulkStatus')?.value || 'active';
          btn.disabled = true;
          btn.textContent = 'Pushing...';
          try {
            const result = await window.HuntDrop.StoreConnect.pushSelected(
              window.HuntDrop.ALL_PRODUCTS || _allResults,
              status
            );
            btn.textContent = result.success ? '✅ Done!' : '❌ Failed';
            UI.toast &&
              UI.toast(
                result.success
                  ? result.created + ' products pushed to Trendaryo'
                  : 'Push failed: ' + (result.error || 'unknown'),
                result.success ? 'success' : 'error'
              );
          } catch (e) {
            btn.textContent = '❌ Error';
          }
          setTimeout(function () {
            btn.disabled = false;
            btn.innerHTML =
              '<svg width="16" height="16" ...><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> Push to Trendaryo';
          }, 3000);
        });

        document.getElementById('scBulkClose')?.addEventListener('click', function () {
          if (window.HuntDrop.StoreConnect) {
            window.HuntDrop.StoreConnect.clearSelection();
          }
          EventBus.emit('store:selectMode', { active: false });
        });
      }
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

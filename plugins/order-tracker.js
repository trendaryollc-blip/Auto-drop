// ============================================================================
// PLUGIN: Order & Fulfillment Tracker — Complete post-sale operations hub
// ============================================================================
(function(){
try{
const {EventBus,PluginRegistry,UI,Config} = window.HuntDrop;
const esc = s => UI.escapeHtml(String(s||''));

let _section = null;
let _cleanups = [];
let _orders = [];

const CARRIERS = [
  { id:'epacket', name:'ePacket', icon:'📧', trackUrl:'https://www.17track.net/en/track#nums=', maxDays:30 },
  { id:'cj_packet', name:'CJ Packet', icon:'⚡', trackUrl:'https://www.17track.net/en/track#nums=', maxDays:25 },
  { id:'usps', name:'USPS', icon:'🇺🇸', trackUrl:'https://tools.usps.com/go/TrackConfirmAction?tLabels=', maxDays:14 },
  { id:'ups', name:'UPS', icon:'📦', trackUrl:'https://www.ups.com/track?loc=en_US&tracknum=', maxDays:10 },
  { id:'fedex', name:'FedEx', icon:'✈️', trackUrl:'https://www.fedex.com/fedextrack/?trknbr=', maxDays:7 },
  { id:'dhl', name:'DHL', icon:'🌍', trackUrl:'https://www.dhl.com/en/express/tracking.html?AWB=', maxDays:10 },
  { id:'china_post', name:'China Post', icon:'🇨🇳', trackUrl:'https://www.17track.net/en/track#nums=', maxDays:45 },
  { id:'yanwen', name:'Yanwen', icon:'📦', trackUrl:'https://www.17track.net/en/track#nums=', maxDays:35 },
  { id:'sunyou', name:'SunYou', icon:'📦', trackUrl:'https://www.17track.net/en/track#nums=', maxDays:30 },
  { id:'other', name:'Other', icon:'📋', trackUrl:'#', maxDays:30 }
];

const STATUSES = [
  { id:'ordered', name:'Ordered', icon:'🛒', color:'var(--accent-cyan)', bg:'var(--accent-cyan-dim)' },
  { id:'processing', name:'Processing', icon:'⚙️', color:'var(--accent-yellow)', bg:'rgba(245,158,11,0.1)' },
  { id:'shipped', name:'Shipped', icon:'📤', color:'var(--accent-purple)', bg:'rgba(139,92,246,0.1)' },
  { id:'in_transit', name:'In Transit', icon:'🚚', color:'var(--accent-orange)', bg:'rgba(255,138,0,0.1)' },
  { id:'out_for_delivery', name:'Out for Delivery', icon:'🏃', color:'var(--accent-cyan)', bg:'var(--accent-cyan-dim)' },
  { id:'delivered', name:'Delivered', icon:'✅', color:'var(--accent-green)', bg:'var(--accent-green-dim)' },
  { id:'completed', name:'Completed', icon:'🎉', color:'var(--accent-green)', bg:'var(--accent-green-dim)' },
  { id:'issue', name:'Issue', icon:'⚠️', color:'var(--accent-red)', bg:'rgba(255,51,102,0.1)' },
  { id:'returned', name:'Returned', icon:'🔄', color:'var(--accent-orange)', bg:'rgba(255,138,0,0.1)' },
  { id:'refunded', name:'Refunded', icon:'💸', color:'var(--accent-red)', bg:'rgba(255,51,102,0.1)' }
];

const SAMPLE_ORDERS = [
  { id:'ORD-001', product:'Wireless Earbuds Pro', customer:'Sarah M.', date:'2026-07-10', status:'in_transit', carrier:'cj_packet', tracking:'CJ1234567890', cost:12.99, sellPrice:29.99, shipFrom:'China', destination:'USA', orderedAt:'2026-07-10', shippedAt:'2026-07-12', estDelivery:'2026-07-22', notes:'' },
  { id:'ORD-002', product:'LED Strip Lights 5m', customer:'Mike R.', date:'2026-07-11', status:'shipped', carrier:'epacket', tracking:'EP9876543210', cost:6.50, sellPrice:18.99, shipFrom:'China', destination:'USA', orderedAt:'2026-07-11', shippedAt:'2026-07-13', estDelivery:'2026-07-25', notes:'' },
  { id:'ORD-003', product:'Phone Case Set', customer:'Emma L.', date:'2026-07-12', status:'delivered', carrier:'usps', tracking:'9400111899223100', cost:3.20, sellPrice:12.99, shipFrom:'USA (LA)', destination:'USA', orderedAt:'2026-07-12', shippedAt:'2026-07-12', estDelivery:'2026-07-15', deliveredAt:'2026-07-15', notes:'' },
  { id:'ORD-004', product:'Smart Watch Band', customer:'John D.', date:'2026-07-08', status:'issue', carrier:'epacket', tracking:'EP5555555555', cost:4.50, sellPrice:15.99, shipFrom:'China', destination:'Canada', orderedAt:'2026-07-08', shippedAt:'2026-07-10', estDelivery:'2026-07-20', notes:'Customer reports wrong color sent' },
  { id:'ORD-005', product:'Portable Charger 20000mAh', customer:'Lisa K.', date:'2026-07-13', status:'processing', carrier:'cj_packet', tracking:'', cost:11.00, sellPrice:34.99, shipFrom:'China', destination:'UK', orderedAt:'2026-07-13', shippedAt:'', estDelivery:'2026-07-27', notes:'' },
  { id:'ORD-006', product:'Yoga Mat Premium', customer:'Alex T.', date:'2026-07-09', status:'in_transit', carrier:'dhl', tracking:'DHL1234567890', cost:8.50, sellPrice:24.99, shipFrom:'China', destination:'Australia', orderedAt:'2026-07-09', shippedAt:'2026-07-11', estDelivery:'2026-07-19', notes:'' },
  { id:'ORD-007', product:'Kitchen Timer Set', customer:'Nina P.', date:'2026-07-14', status:'ordered', carrier:'', tracking:'', cost:2.80, sellPrice:9.99, shipFrom:'China', destination:'USA', orderedAt:'2026-07-14', shippedAt:'', estDelivery:'', notes:'Awaiting supplier confirmation' },
  { id:'ORD-008', product:'Bluetooth Speaker Mini', customer:'Tom H.', date:'2026-07-07', status:'refunded', carrier:'epacket', tracking:'EP1111111111', cost:7.50, sellPrice:22.99, shipFrom:'China', destination:'Germany', orderedAt:'2026-07-07', shippedAt:'2026-07-09', estDelivery:'2026-07-19', notes:'Item damaged in transit — full refund issued' },
  { id:'ORD-009', product:'Car Phone Mount', customer:'David W.', date:'2026-07-11', status:'completed', carrier:'cj_packet', tracking:'CJ9999999999', cost:3.99, sellPrice:14.99, shipFrom:'China', destination:'USA', orderedAt:'2026-07-11', shippedAt:'2026-07-12', estDelivery:'2026-07-20', deliveredAt:'2026-07-18', notes:'Customer left 5-star review' },
  { id:'ORD-010', product:'Bamboo Cutting Board', customer:'Rachel S.', date:'2026-07-12', status:'out_for_delivery', carrier:'ups', tracking:'UPS1Z999AA1012345678', cost:9.00, sellPrice:27.99, shipFrom:'USA (Dallas)', destination:'USA', orderedAt:'2026-07-12', shippedAt:'2026-07-12', estDelivery:'2026-07-15', notes:'' }
];

function getStoredOrders(){
  try{ return JSON.parse(localStorage.getItem('hd_orders')) || SAMPLE_ORDERS; }catch(e){ return SAMPLE_ORDERS; }
}
function saveOrders(orders){ try{ localStorage.setItem('hd_orders', JSON.stringify(orders)); }catch(e){} }

function detectCarrier(tracking){
  if(!tracking) return 'other';
  const t = tracking.toUpperCase();
  if(t.startsWith('CJ')) return 'cj_packet';
  if(t.startsWith('EP')) return 'epacket';
  if(t.startsWith('94') && t.length === 22) return 'usps';
  if(t.startsWith('1Z')) return 'ups';
  if(t.startsWith('DHL')) return 'dhl';
  if(t.startsWith('7')) return 'china_post';
  return 'other';
}

function daysSince(dateStr){
  if(!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - d) / (1000*60*60*24));
}

function isLate(order){
  if(!order.estDelivery || ['delivered','completed','refunded','returned'].includes(order.status)) return false;
  return new Date(order.estDelivery) < new Date();
}

function generateWISMOReply(order){
  const carrier = CARRIERS.find(c=>c.id===order.carrier) || CARRIERS[0];
  const days = daysSince(order.shippedAt || order.orderedAt);
  if(order.status === 'delivered' || order.status === 'completed'){
    return `Hi ${order.customer.split(' ')[0]},\n\nGreat news! Your order ${order.id} (${order.product}) was delivered on ${order.deliveredAt || 'recently'}. Please let us know if you have any questions or need anything else!\n\nThank you for your purchase! 🎉`;
  }
  if(order.status === 'issue'){
    return `Hi ${order.customer.split(' ')[0]},\n\nWe're sorry to hear about the issue with your order ${order.id} (${order.product}). We're looking into this right now and will have an update for you within 24 hours.\n\nYour tracking number is: ${order.tracking || 'Pending'}\n\nWe appreciate your patience and will make this right.`;
  }
  if(order.tracking){
    return `Hi ${order.customer.split(' ')[0]},\n\nYour order ${order.id} (${order.product}) is currently ${STATUSES.find(s=>s.id===order.status)?.name || 'in progress'}.\n\n📦 Tracking: ${order.tracking}\n🚚 Carrier: ${carrier.name}\n📅 Expected delivery: ${order.estDelivery || 'Within ' + carrier.maxDays + ' days'}\n🔗 Track here: ${carrier.trackUrl}${order.tracking}\n\nYou can track your package in real-time using the link above. Thank you for your patience!`;
  }
  return `Hi ${order.customer.split(' ')[0]},\n\nYour order ${order.id} (${order.product}) is being processed by our supplier. We'll send you tracking details as soon as it ships.\n\nExpected shipping within 2-3 business days. Thank you for your patience!`;
}

function getStats(){
  const orders = _orders;
  const total = orders.length;
  const inTransit = orders.filter(o=>['shipped','in_transit','out_for_delivery'].includes(o.status)).length;
  const issues = orders.filter(o=>o.status==='issue').length;
  const delivered = orders.filter(o=>['delivered','completed'].includes(o.status)).length;
  const lateOrders = orders.filter(o=>isLate(o)).length;
  const onTimeRate = delivered > 0 ? Math.round(((delivered - lateOrders) / delivered) * 100) : 100;
  const totalRevenue = orders.filter(o=>!['refunded','returned'].includes(o.status)).reduce((s,o)=>s+o.sellPrice,0);
  const totalCost = orders.filter(o=>!['refunded','returned'].includes(o.status)).reduce((s,o)=>s+o.cost,0);
  return { total, inTransit, issues, onTimeRate, delivered, lateOrders, totalRevenue:Math.round(totalRevenue*100)/100, totalCost:Math.round(totalCost*100)/100 };
}

function renderOrdersList(orders){
  const el = UI.$('otOrdersList');
  if(!el) return;
  if(!orders.length){
    el.innerHTML = '<div class="ot-empty">No orders match this filter</div>';
    return;
  }
  el.innerHTML = orders.map(o=>{
    const st = STATUSES.find(s=>s.id===o.status) || STATUSES[0];
    const carrier = CARRIERS.find(c=>c.id===o.carrier) || CARRIERS[0];
    const late = isLate(o);
    const days = o.shippedAt ? daysSince(o.shippedAt) : daysSince(o.orderedAt);
    return `<div class="ot-order-card ${late?'ot-late':''}" data-order-id="${o.id}" role="button" tabindex="0" style="cursor:pointer">
      <div class="ot-order-head">
        <span class="ot-order-id">${esc(o.id)}</span>
        <span class="ot-order-status" style="background:${st.bg};color:${st.color}">${st.icon} ${st.name}</span>
        ${late?'<span class="ot-late-badge">⚠️ LATE</span>':''}
      </div>
      <div class="ot-order-body">
        <div class="ot-order-product">${esc(o.product)}</div>
        <div class="ot-order-customer">👤 ${esc(o.customer)} · 📍 ${esc(o.destination)}</div>
        <div class="ot-order-meta">
          <span>💰 $${o.sellPrice.toFixed(2)} (cost: $${o.cost.toFixed(2)})</span>
          <span>${carrier.icon} ${carrier.name}</span>
          ${o.tracking?`<span class="ot-tracking">${esc(o.tracking)}</span>`:'<span class="ot-no-tracking">No tracking yet</span>'}
        </div>
        ${o.estDelivery?`<div class="ot-order-delivery">📅 Expected: ${o.estDelivery} ${late?'(OVERDUE)':''}</div>`:''}
        ${o.notes?`<div class="ot-order-notes">📝 ${esc(o.notes)}</div>`:''}
      </div>
      <div class="ot-order-actions">
        <select class="ot-status-select" data-order="${o.id}">
          ${STATUSES.map(s=>`<option value="${s.id}" ${s.id===o.status?'selected':''}>${s.icon} ${s.name}</option>`).join('')}
        </select>
        ${o.tracking?`<a href="${carrier.trackUrl}${o.tracking}" target="_blank" class="ot-track-link" onclick="event.stopPropagation()">🔗 Track</a>`:''}
        <button class="ot-wismo-btn" data-order="${o.id}" onclick="event.stopPropagation()">💬 WISMO</button>
        <button class="ot-delete-btn" data-order="${o.id}" onclick="event.stopPropagation()">🗑</button>
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('.ot-status-select').forEach(sel=>{
    sel.addEventListener('change', function(){
      const orderId = this.dataset.order;
      const newStatus = this.value;
      const order = _orders.find(o=>o.id===orderId);
      if(order){
        order.status = newStatus;
        if(newStatus === 'shipped' && !order.shippedAt) order.shippedAt = new Date().toISOString().split('T')[0];
        if(newStatus === 'delivered') order.deliveredAt = new Date().toISOString().split('T')[0];
        saveOrders(_orders);
        refreshAll();
      }
    });
  });

  el.querySelectorAll('.ot-wismo-btn').forEach(btn=>{
    btn.addEventListener('click', function(){
      const orderId = this.dataset.order;
      const sel = UI.$('otWismoOrder');
      if(sel){ sel.value = orderId; sel.dispatchEvent(new Event('change')); }
      UI.$('otWismoPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  el.querySelectorAll('.ot-delete-btn').forEach(btn=>{
    btn.addEventListener('click', function(){
      if(!confirm('Delete this order?')) return;
      _orders = _orders.filter(o=>o.id !== this.dataset.order);
      saveOrders(_orders);
      refreshAll();
    });
  });
}

function renderSupplierGrid(){
  const el = UI.$('otSupplierGrid');
  if(!el) return;
  const suppliers = {};
  _orders.forEach(o=>{
    const key = o.shipFrom || 'Unknown';
    if(!suppliers[key]) suppliers[key] = { name:key, total:0, delivered:0, issues:0, late:0, revenue:0, cost:0, avgDays:0, daysSum:0, daysCount:0 };
    const s = suppliers[key];
    s.total++;
    if(['delivered','completed'].includes(o.status)) s.delivered++;
    if(o.status === 'issue') s.issues++;
    if(isLate(o)) s.late++;
    if(!['refunded','returned'].includes(o.status)){ s.revenue += o.sellPrice; s.cost += o.cost; }
    if(o.shippedAt && (o.deliveredAt || o.estDelivery)){
      const days = daysSince(o.shippedAt);
      if(days > 0 && days < 100){ s.daysSum += days; s.daysCount++; }
    }
  });
  Object.values(suppliers).forEach(s => {
    s.avgDays = s.daysCount > 0 ? Math.round(s.daysSum / s.daysCount) : 0;
    s.fulfillmentRate = s.total > 0 ? Math.round((s.delivered / s.total) * 100) : 0;
    s.issueRate = s.total > 0 ? Math.round((s.issues / s.total) * 100) : 0;
    s.lateRate = s.total > 0 ? Math.round((s.late / s.total) * 100) : 0;
  });
  const sorted = Object.values(suppliers).sort((a,b)=>b.total-a.total);
  el.innerHTML = sorted.map(s=>{
    const grade = s.fulfillmentRate >= 90 ? 'A' : s.fulfillmentRate >= 75 ? 'B' : s.fulfillmentRate >= 60 ? 'C' : 'D';
    const gradeColor = grade==='A'?'var(--accent-green)':grade==='B'?'var(--accent-cyan)':grade==='C'?'var(--accent-yellow)':'var(--accent-red)';
    return `<div class="ot-supplier-card" data-section="section-supplier-intel" role="button" tabindex="0" style="cursor:pointer">
      <div class="ot-sup-header">
        <div class="ot-sup-name">${esc(s.name)}</div>
        <div class="ot-sup-grade" style="color:${gradeColor};border-color:${gradeColor}">Grade ${grade}</div>
      </div>
      <div class="ot-sup-metrics">
        <div class="ot-sup-m"><span class="ot-sup-m-label">Total Orders</span><span class="ot-sup-m-val">${s.total}</span></div>
        <div class="ot-sup-m"><span class="ot-sup-m-label">Fulfillment Rate</span><span class="ot-sup-m-val" style="color:${s.fulfillmentRate>=80?'var(--accent-green)':'var(--accent-red)'}">${s.fulfillmentRate}%</span></div>
        <div class="ot-sup-m"><span class="ot-sup-m-label">Avg Ship Time</span><span class="ot-sup-m-val">${s.avgDays} days</span></div>
        <div class="ot-sup-m"><span class="ot-sup-m-label">Issue Rate</span><span class="ot-sup-m-val" style="color:${s.issueRate<=5?'var(--accent-green)':'var(--accent-red)'}">${s.issueRate}%</span></div>
        <div class="ot-sup-m"><span class="ot-sup-m-label">Late Rate</span><span class="ot-sup-m-val" style="color:${s.lateRate<=10?'var(--accent-green)':'var(--accent-red)'}">${s.lateRate}%</span></div>
        <div class="ot-sup-m"><span class="ot-sup-m-label">Revenue</span><span class="ot-sup-m-val" style="color:var(--accent-green)">$${Math.round(s.revenue)}</span></div>
      </div>
      <div class="ot-sup-bar"><div class="ot-sup-bar-fill" style="width:${s.fulfillmentRate}%;background:${gradeColor}"></div></div>
    </div>`;
  }).join('');
}

function renderAlerts(){
  const el = UI.$('otAlerts');
  if(!el) return;
  const alerts = [];
  _orders.forEach(o=>{
    if(isLate(o)) alerts.push({ type:'late', icon:'⏰', title:`${o.id} is LATE`, desc:`${o.product} for ${o.customer} — expected ${o.estDelivery}`, severity:'high', order:o, section:'section-shipping-calc' });
    if(o.status==='issue') alerts.push({ type:'issue', icon:'⚠️', title:`${o.id} has an ISSUE`, desc:`${o.notes || 'No details provided'}`, severity:'high', order:o, section:'section-refund-shield' });
    if(o.shippedAt && !o.tracking && ['shipped','in_transit'].includes(o.status)) alerts.push({ type:'no-track', icon:'🔍', title:`${o.id} — No tracking number`, desc:`${o.product} shipped but no tracking number entered`, severity:'medium', order:o, section:'section-supplier-intel' });
    if(!o.shippedAt && o.status==='ordered' && daysSince(o.orderedAt) > 2) alerts.push({ type:'unshipped', icon:'📦', title:`${o.id} — Not yet shipped`, desc:`Ordered ${daysSince(o.orderedAt)} days ago, still processing`, severity:'medium', order:o, section:'section-supplier-hub' });
  });
  alerts.sort((a,b)=>a.severity==='high'?-1:1);
  if(!alerts.length){
    el.innerHTML = '<div class="ot-alerts-empty">✅ No alerts — all orders on track!</div>';
    return;
  }
  el.innerHTML = alerts.map(a=>`
    <div class="ot-alert-card ot-alert-${a.severity}" data-section="${a.section}" role="button" tabindex="0" style="cursor:pointer">
      <div class="ot-alert-icon">${a.icon}</div>
      <div class="ot-alert-info">
        <div class="ot-alert-title">${esc(a.title)}</div>
        <div class="ot-alert-desc">${esc(a.desc)}</div>
      </div>
      <div class="ot-alert-actions">
        <button class="ot-alert-wismo" data-order="${a.order.id}" onclick="event.stopPropagation()">💬 WISMO</button>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.ot-alert-wismo').forEach(btn=>{
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      const sel = UI.$('otWismoOrder');
      if(sel){ sel.value = this.dataset.order; sel.dispatchEvent(new Event('change')); }
      UI.$('otWismoPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
}

function refreshAll(){
  const stats = getStats();
  renderOrdersList(_orders);
  renderSupplierGrid();
  renderAlerts();
  const pipeline = UI.$('otPipeline');
  if(pipeline){
    pipeline.querySelectorAll('.ot-pipe-card').forEach(card=>{
      const status = card.dataset.status;
      const count = _orders.filter(o=>o.status===status).length;
      const countEl = card.querySelector('.ot-pipe-count');
      if(countEl) countEl.textContent = count;
    });
  }
}

function bindEvents(cfg){
  if(!_section) return;

  _section.querySelectorAll('.ot-pipe-card').forEach(card=>{
    card.addEventListener('click', function(){
      const status = this.dataset.status;
      _section.querySelectorAll('.ot-filter-btn').forEach(b=>b.classList.remove('active'));
      const matchBtn = _section.querySelector(`.ot-filter-btn[data-filter="${status}"]`);
      if(matchBtn) matchBtn.classList.add('active');
      const filtered = status === 'all' ? _orders : _orders.filter(o=>o.status===status);
      renderOrdersList(filtered);
    });
  });

  _section.querySelectorAll('.ot-filter-btn').forEach(btn=>{
    btn.addEventListener('click', function(){
      _section.querySelectorAll('.ot-filter-btn').forEach(b=>b.classList.remove('active'));
      this.classList.add('active');
      const filter = this.dataset.filter;
      const filtered = filter === 'all' ? _orders : _orders.filter(o=>o.status===filter);
      renderOrdersList(filtered);
    });
  });

  UI.$('otAddOrderBtn')?.addEventListener('click', ()=>{
    const id = UI.$('otNewId')?.value || 'ORD-' + String(_orders.length+1).padStart(3,'0');
    const product = UI.$('otNewProduct')?.value || 'New Product';
    const customer = UI.$('otNewCustomer')?.value || 'Customer';
    const cost = parseFloat(UI.$('otNewCost')?.value)||0;
    const sell = parseFloat(UI.$('otNewSell')?.value)||0;
    const from = UI.$('otNewFrom')?.value || 'China';
    const dest = UI.$('otNewDest')?.value || 'USA';
    const carrier = UI.$('otNewCarrier')?.value || 'other';
    const tracking = UI.$('otNewTracking')?.value || '';
    const estDel = UI.$('otNewEstDel')?.value || '';
    const now = new Date().toISOString().split('T')[0];
    const order = {
      id, product, customer, date:now, status:'ordered',
      carrier: tracking ? detectCarrier(tracking) : carrier,
      tracking, cost, sellPrice:sell, shipFrom:from, destination:dest,
      orderedAt:now, shippedAt:'', estDelivery:estDel, notes:''
    };
    _orders.unshift(order);
    saveOrders(_orders);
    refreshAll();
    ['otNewId','otNewProduct','otNewCustomer','otNewCost','otNewSell','otNewFrom','otNewDest','otNewTracking','otNewEstDel'].forEach(x=>{ const el=UI.$(x); if(el) el.value=''; });
    UI.toast && UI.toast('Order added successfully','success');
  });

  UI.$('otWismoOrder')?.addEventListener('change', function(){
    const orderId = this.value;
    const order = _orders.find(o=>o.id===orderId);
    const out = UI.$('otWismoOutput');
    if(!out) return;
    if(!order){
      out.innerHTML = '<div class="ot-wismo-placeholder">Select an order above to generate a WISMO response</div>';
      return;
    }
    const reply = generateWISMOReply(order);
    out.innerHTML = `<div class="ot-wismo-reply">
      <div class="ot-wismo-header"><span>Generated for: ${esc(order.id)} — ${esc(order.customer)}</span><button class="ot-copy-btn" data-reply="wismo">📋 Copy</button></div>
      <pre class="ot-wismo-text">${esc(reply)}</pre>
    </div>`;
    out.querySelector('.ot-copy-btn')?.addEventListener('click', function(){
      navigator.clipboard.writeText(reply).then(()=>{ UI.toast && UI.toast('Copied to clipboard!','success'); });
    });
  });
}

PluginRegistry.register('order-tracker', {
  id: 'order-tracker',
  name: 'Order Tracker',
  version: '1.0.0',
  description: 'Complete order fulfillment command center — track shipments, manage WISMO tickets, monitor supplier performance',

  init(_ctx){
    Config.defaults('orderTracker', { view:'pipeline', filter:'all', sortBy:'date' });
    _orders = getStoredOrders();
  },

  mount(_ctx){
    const container = UI.$('sections-container');
    if(!container) return;
    const cfg = Config.get('orderTracker') || {};

    const section = document.createElement('section');
    section.className = 'section section-order-tracker';
    section.id = 'section-order-tracker';

    const stats = getStats();

    section.innerHTML = `
      <div class="section-inner">
        <div class="ot-hero">
          <div class="ot-hero-bg"></div>
          <div class="ot-hero-content">
            <div class="ot-hero-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              Fulfillment Command Center
            </div>
            <h1 class="ot-hero-title">Order Tracker</h1>
            <p class="ot-hero-desc">Track every order from placement to delivery. AI-powered WISMO responses, supplier scorecards, and proactive issue alerts — all in one place.</p>
            <div class="ot-hero-kpis">
              <div class="ot-hkpi" data-section="section-order-tracker" role="button" tabindex="0" style="cursor:pointer"><div class="ot-hkpi-val">${stats.total}</div><div class="ot-hkpi-label">Total Orders</div></div>
              <div class="ot-hkpi" data-section="section-order-tracker" data-filter="in_transit" role="button" tabindex="0" style="cursor:pointer"><div class="ot-hkpi-val">${stats.inTransit}</div><div class="ot-hkpi-label">In Transit</div></div>
              <div class="ot-hkpi" data-section="section-refund-shield" role="button" tabindex="0" style="cursor:pointer"><div class="ot-hkpi-val">${stats.issues}</div><div class="ot-hkpi-label">Issues</div></div>
              <div class="ot-hkpi" data-section="section-store-health" role="button" tabindex="0" style="cursor:pointer"><div class="ot-hkpi-val">${stats.onTimeRate}%</div><div class="ot-hkpi-label">On-Time Rate</div></div>
            </div>
          </div>
        </div>

        <div class="ot-section">
          <div class="ot-section-header">
            <h2 class="ot-section-title">📊 Order Pipeline</h2>
            <p class="ot-section-desc">Visual overview of all orders by fulfillment stage — click any stage to filter</p>
          </div>
          <div class="ot-pipeline" id="otPipeline">
            ${STATUSES.filter(s=>!['completed','refunded','returned'].includes(s.id)).map(s => {
              const count = _orders.filter(o=>o.status===s.id).length;
              return `<div class="ot-pipe-card" data-status="${s.id}" tabindex="0" role="button">
                <div class="ot-pipe-icon" style="background:${s.bg};color:${s.color}">${s.icon}</div>
                <div class="ot-pipe-count" style="color:${s.color}">${count}</div>
                <div class="ot-pipe-name">${s.name}</div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="ot-section">
          <div class="ot-section-header">
            <h2 class="ot-section-title">🛒 Add New Order</h2>
            <p class="ot-section-desc">Log a new order to start tracking it through the fulfillment pipeline</p>
          </div>
          <div class="ot-panel">
            <div class="ot-add-form" id="otAddForm">
              <div class="ot-form-row">
                <div class="ot-field"><label class="ot-label">Order ID</label><input id="otNewId" class="ot-input" placeholder="ORD-011"></div>
                <div class="ot-field"><label class="ot-label">Product Name</label><input id="otNewProduct" class="ot-input" placeholder="Product name"></div>
                <div class="ot-field"><label class="ot-label">Customer</label><input id="otNewCustomer" class="ot-input" placeholder="Customer name"></div>
              </div>
              <div class="ot-form-row">
                <div class="ot-field"><label class="ot-label">Product Cost ($)</label><input id="otNewCost" class="ot-input" type="number" min="0" step="0.01" placeholder="0.00"></div>
                <div class="ot-field"><label class="ot-label">Sell Price ($)</label><input id="otNewSell" class="ot-input" type="number" min="0" step="0.01" placeholder="0.00"></div>
                <div class="ot-field"><label class="ot-label">Ship From</label><input id="otNewFrom" class="ot-input" placeholder="China"></div>
                <div class="ot-field"><label class="ot-label">Destination</label><input id="otNewDest" class="ot-input" placeholder="USA"></div>
              </div>
              <div class="ot-form-row">
                <div class="ot-field"><label class="ot-label">Carrier</label>
                  <select id="otNewCarrier" class="ot-select">${CARRIERS.map(c=>`<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}</select>
                </div>
                <div class="ot-field"><label class="ot-label">Tracking Number</label><input id="otNewTracking" class="ot-input" placeholder="Auto-detected from number"></div>
                <div class="ot-field"><label class="ot-label">Est. Delivery</label><input id="otNewEstDel" class="ot-input" type="date"></div>
              </div>
              <button class="ot-add-btn" id="otAddOrderBtn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Order
              </button>
            </div>
          </div>
        </div>

        <div class="ot-section">
          <div class="ot-section-header">
            <h2 class="ot-section-title">📋 All Orders</h2>
            <p class="ot-section-desc">Manage your complete order log — update status, copy WISMO replies, view tracking</p>
          </div>
          <div class="ot-filters">
            <button class="ot-filter-btn active" data-filter="all">All (${stats.total})</button>
            ${STATUSES.map(s=>{ const c=_orders.filter(o=>o.status===s.id).length; return c>0?`<button class="ot-filter-btn" data-filter="${s.id}">${s.icon} ${s.name} (${c})</button>`:''; }).join('')}
          </div>
          <div class="ot-orders-list" id="otOrdersList"></div>
        </div>

        <div class="ot-section">
          <div class="ot-section-header">
            <h2 class="ot-section-title">🏭 Supplier Scorecard</h2>
            <p class="ot-section-desc">Rolling performance metrics per supplier — identify underperformers before they hurt your store</p>
          </div>
          <div class="ot-supplier-grid" id="otSupplierGrid"></div>
        </div>

        <div class="ot-section">
          <div class="ot-section-header">
            <h2 class="ot-section-title">💬 WISMO Auto-Responder</h2>
            <p class="ot-section-desc">AI-generated "Where Is My Order?" replies — copy and send with one click</p>
          </div>
          <div class="ot-wismo-panel" id="otWismoPanel">
            <div class="ot-wismo-select">
              <label class="ot-label">Select Order</label>
              <select id="otWismoOrder" class="ot-select">
                <option value="">Choose an order...</option>
                ${_orders.filter(o=>o.status!=='completed').map(o=>`<option value="${o.id}">${o.id} — ${o.product} (${o.customer})</option>`).join('')}
              </select>
            </div>
            <div class="ot-wismo-output" id="otWismoOutput">
              <div class="ot-wismo-placeholder">Select an order above to generate a WISMO response</div>
            </div>
          </div>
        </div>

        <div class="ot-section">
          <div class="ot-section-header">
            <h2 class="ot-section-title">⚠️ Attention Needed</h2>
            <p class="ot-section-desc">Orders requiring immediate action — late shipments, issues, and at-risk deliveries</p>
          </div>
          <div class="ot-alerts" id="otAlerts"></div>
        </div>

        ${window.HuntDrop.renderRelatedTools ? window.HuntDrop.renderRelatedTools([
          {section:'section-profit-lab', name:'Profit Calculator', desc:'Factor refund rates into profit margins', icon:'💰', color:'var(--accent-green)'},
          {section:'section-supplier-intel', name:'Supplier Check', desc:'Verify supplier reliability scores', icon:'🛡', color:'var(--accent-yellow)'},
          {section:'section-store-health', name:'Store Health', desc:'Fulfillment data feeds store scoring', icon:'❤', color:'var(--accent-red)'},
          {section:'section-shipping-calc', name:'Shipping Calculator', desc:'Compare shipping methods and costs', icon:'🚚', color:'var(--accent-orange)'},
          {section:'section-refund-shield', name:'Refund Shield', desc:'Track refund patterns and root causes', icon:'🛡', color:'var(--accent-purple)'},
          {section:'section-cash-flow', name:'Cash Flow', desc:'Monitor cash position from order revenue', icon:'💳', color:'var(--accent-cyan)'}
        ]) : ''}
      </div>`;
    container.appendChild(section);
    _section = section;
    bindEvents(cfg);
    renderOrdersList(_orders);
    renderSupplierGrid();
    renderAlerts();

    section.addEventListener('click', (e) => {
      const card = e.target.closest('[data-section]');
      if (!card) return;
      e.preventDefault();
      const target = card.getAttribute('data-section');
      if (target && window.HuntDrop && window.HuntDrop.navigateTo) {
        window.HuntDrop.navigateTo(target);
      }
    });

    section.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('[data-section]');
        if (card) {
          e.preventDefault();
          card.click();
        }
      }
    });

    section.addEventListener('click', (e) => {
      const card = e.target.closest('.ot-order-card[data-order-id]');
      if (!card) return;
      if (e.target.closest('select, button, a, .ot-status-select, .ot-wismo-btn, .ot-delete-btn, .ot-track-link')) return;
      e.preventDefault();
      const orderId = card.getAttribute('data-order-id');
      const sel = UI.$('otWismoOrder');
      if (sel && orderId) {
        sel.value = orderId;
        sel.dispatchEvent(new Event('change'));
        UI.$('otWismoPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
      }
    });
  },

  unmount(_ctx){
    (_cleanups||[]).forEach(fn=>{try{fn();}catch(e){}});
    _cleanups = [];
    const el = UI.$('section-order-tracker');
    if(el) el.remove();
    _section = null;
  }
});
Object.defineProperty(window.HuntDrop.PluginRegistry.get('order-tracker'), '_section', {
  get(){ return _section; }, set(v){ _section = v; }, configurable: true
});
}catch(e){ console.error('[OrderTracker] error:', e); }
})();

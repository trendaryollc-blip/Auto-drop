// ============================================================================
// HUNTDROP CORE v2.0 — Immovable Foundation
// ============================================================================
// RULE: This file is NEVER modified. Features are added via plugins.
// To add a feature: create a plugin file in /plugins/, register it. Done.
// ============================================================================
(function() {
'use strict';

// ===== 1. EVENT BUS =====
const EventBus = (() => {
  const _l = new Map();
  return {
    on(e, cb, opts={}) {
      if (!_l.has(e)) _l.set(e, []);
      const entry = {cb, priority: opts.priority||0, ctx: opts.context||null};
      _l.get(e).push(entry);
      _l.get(e).sort((a,b) => b.priority - a.priority);
      return () => { const a=_l.get(e); if(a){const i=a.indexOf(entry);if(i>-1)a.splice(i,1);} };
    },
    once(e, cb, opts={}) {
      const w = (...args) => { this.off(e,w); cb.apply(opts.context||null,args); };
      return this.on(e, w, opts);
    },
    off(e, cb) {
      const a=_l.get(e);
      if(a){if(cb){const i=a.findIndex(x=>x.cb===cb);if(i>-1)a.splice(i,1);}else{_l.delete(e);}}
    },
    async emit(e, data) {
      const a=_l.get(e)||[];
      const r=[];
      for(const entry of a){
        try{r.push(await entry.cb.call(entry.ctx,data));}
        catch(err){console.error(`[EventBus] Error in "${e}":`,err);}
      }
      return r;
    },
    has(e){return _l.has(e)&&_l.get(e).length>0;},
    events(){return[..._l.keys()];},
    clear(){_l.clear();}
  };
})();

// ===== 2. PLUGIN REGISTRY =====
const PluginRegistry = (() => {
  const _p = new Map();
  const _h = new Map();
  return {
    register(id, plugin) {
      const def = {
        id, version: plugin.version||'1.0.0', name: plugin.name||id,
        description: plugin.description||'', author: plugin.author||'unknown',
        dependencies: plugin.dependencies||[], routes: plugin.routes||[],
        components: plugin.components||{}, hooks: plugin.hooks||{}, config: plugin.config||{},
        init: plugin.init||(async()=>{}), mount: plugin.mount||(async()=>{}),
        unmount: plugin.unmount||(async()=>{}), destroy: plugin.destroy||(async()=>{}),
        _mounted:false, _initialized:false
      };
      for(const dep of def.dependencies){
        if(!_p.has(dep)){console.error(`[Plugin] "${id}" needs "${dep}"`);return false;}
      }
      _p.set(id, def);
      Object.entries(def.hooks).forEach(([h,fn])=>this.addHook(h,id,fn));
      EventBus.emit('plugin:registered',{id,plugin:def});
      return true;
    },
    async init(id){
      const p=_p.get(id); if(!p||p._initialized)return;
      try{await p.init({EventBus,PluginRegistry,Config,DataLayer,UI});p._initialized=true;EventBus.emit('plugin:initialized',{id});}
      catch(e){console.error(`[Plugin] Init "${id}" failed:`,e);}
    },
    async mount(id){
      const p=_p.get(id); if(!p||p._mounted)return;
      try{await p.mount({EventBus,PluginRegistry,Config,DataLayer,UI});p._mounted=true;EventBus.emit('plugin:mounted',{id});}
      catch(e){console.error(`[Plugin] Mount "${id}" failed:`,e);}
    },
    async unmount(id){
      const p=_p.get(id); if(!p||!p._mounted)return;
      try{await p.unmount({EventBus,PluginRegistry,Config,DataLayer,UI});p._mounted=false;EventBus.emit('plugin:unmounted',{id});}
      catch(e){console.error(`[Plugin] Unmount "${id}" failed:`,e);}
    },
    async destroy(id){
      await this.unmount(id); const p=_p.get(id);
      if(p){try{await p.destroy({EventBus,PluginRegistry,Config,DataLayer,UI});}catch(e){}_p.delete(id);EventBus.emit('plugin:destroyed',{id});}
    },
    get(id){return _p.get(id);},
    getAll(){return[..._p.values()];},
    addHook(hook,pluginId,fn){if(!_h.has(hook))_h.set(hook,[]);_h.get(hook).push({pluginId,handler:fn});},
    async executeHook(hook,data){
      const handlers=_h.get(hook)||[];let result={...data};
      for(const{pluginId,handler}of handlers){
        try{const m=await handler(result);if(m!==undefined)result=m;}
        catch(e){console.error(`[Plugin] Hook "${hook}" in "${pluginId}":`,e);}
      }
      return result;
    }
  };
})();

// ===== 3. COMPONENT REGISTRY =====
const ComponentRegistry = (() => {
  const _c = new Map();
  const _i = new Map();
  return {
    register(type, def) {
      _c.set(type, {
        render: def.render||(()=>('')),
        mount: def.mount||( ()=>{}),
        unmount: def.unmount||( ()=>{}),
        defaultProps: def.defaultProps||{},
        validate: def.validate||( ()=>true)
      });
    },
    create(type, props={}, container=null) {
      const d=_c.get(type);
      if(!d){console.error(`[Component] Unknown: "${type}"`);return null;}
      const merged={...d.defaultProps,...props};
      if(!d.validate(merged)){console.error(`[Component] Invalid props: "${type}"`);return null;}
      const id=`c_${type}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
      const inst={id,type,props:merged,container,_mounted:false};
      _i.set(id,inst);
      if(container){container.innerHTML=d.render(merged);d.mount(container,merged,id);inst._mounted=true;}
      return inst;
    },
    update(id,newProps){
      const inst=_i.get(id);if(!inst)return;
      const d=_c.get(inst.type);if(!d||!inst.container)return;
      d.unmount(inst.container,inst.props,id);
      inst.props={...inst.props,...newProps};
      inst.container.innerHTML=d.render(inst.props);
      d.mount(inst.container,inst.props,id);
    },
    destroy(id){
      const inst=_i.get(id);if(!inst)return;
      const d=_c.get(inst.type);
      if(d&&inst.container)d.unmount(inst.container,inst.props,id);
      _i.delete(id);
    },
    types(){return[..._c.keys()];}
  };
})();

// ===== 4. CONFIG MANAGER =====
const Config = (() => {
  const _d={}; const _v=new Map();
  return {
    defaults(ns,vals){
      _d[ns]={...(_d[ns]||{}),...vals};
    },
    get(path,fallback){
      const[ns,...keys]=path.split('.');
      let val=_d[ns];
      for(const k of keys){if(val===undefined||val===null)return fallback;val=val[k];}
      return val!==undefined?val:fallback;
    },
    set(path,value){
      const[ns,...keys]=path.split('.');
      if(!_d[ns])_d[ns]={};
      let t=_d[ns];
      for(let i=0;i<keys.length-1;i++){if(!t[keys[i]])t[keys[i]]={};t=t[keys[i]];}
      const last=keys[keys.length-1];
      const old=t[last];
      if(_v.has(path)&&!_v.get(path)(value)){t[last]=old;return false;}
      t[last]=value;
      EventBus.emit('config:changed',{path,value,oldValue:old,namespace:ns});
      return true;
    },
    validate(path,fn){_v.set(path,fn);},
    getAll(ns){return ns?_d[ns]:{..._d};},
    watch(path,cb){
      return EventBus.on('config:changed',d=>{if(d.path===path||d.path.startsWith(path+'.'))cb(d);});
    }
  };
})();

// ===== 5. DATA LAYER =====
const DataLayer = (() => {
  const _adapters = new Map();
  const _cache = new Map();
  return {
    registerAdapter(platform, adapter) {
      _adapters.set(platform, {
        search: adapter.search||(async()=>[]),
        getProduct: adapter.getProduct||(async()=>null),
        getTrends: adapter.getTrends||(async()=>[]),
        getSuppliers: adapter.getSuppliers||(async()=>[]),
        getPrices: adapter.getPrices||(async()=>({})),
        ...adapter
      });
    },
    getAdapter(platform){return _adapters.get(platform);},
    getAdapters(){return[..._adapters.entries()];},
    async searchAll(query, filters={}) {
      const results=[];
      for(const[name,adapter]of _adapters){
        try{
          if(filters.platform&&filters.platform!=='all'&&filters.platform!==name)continue;
          const items=await adapter.search(query,filters);
          results.push(...items.map(item=>({...item,_sourcePlatform:name})));
        }catch(e){console.error(`[DataLayer] Search "${name}":`,e);}
      }
      return results;
    },
    async getFromPlatform(platform,method,...args){
      const adapter=_adapters.get(platform);
      if(!adapter||!adapter[method]){console.error(`[DataLayer] ${platform}.${method} not found`);return null;}
      return adapter[method](...args);
    },
    setCache(key,value,ttl=300000){
      _cache.set(key,{value,expires:Date.now()+ttl});
    },
    getCache(key){
      const entry=_cache.get(key);
      if(!entry||Date.now()>entry.expires){_cache.delete(key);return null;}
      return entry.value;
    },
    clearCache(){_cache.clear();}
  };
})();

// ===== 6. UI UTILITIES =====
const UI = (() => {
  let _toastContainer=null;
  return {
    $(id){return document.getElementById(id);},
    $$(sel,ctx){return(ctx||document).querySelectorAll(sel);},
    create(tag,attrs={},children=[]){
      const el=document.createElement(tag);
      Object.entries(attrs).forEach(([k,v])=>{
        if(k==='className')el.className=v;
        else if(k==='innerHTML')el.innerHTML=v;
        else if(k==='textContent')el.textContent=v;
        else if(k.startsWith('on'))el.addEventListener(k.slice(2).toLowerCase(),v);
        else if(k==='style'&&typeof v==='object')Object.assign(el.style,v);
        else el.setAttribute(k,v);
      });
      children.forEach(c=>{if(typeof c==='string')el.appendChild(document.createTextNode(c));else if(c)el.appendChild(c);});
      return el;
    },
    on(target,event,handler,opts){if(typeof target==='string')target=this.$(target);if(target)target.addEventListener(event,handler,opts);},
    off(target,event,handler){if(typeof target==='string')target=this.$(target);if(target)target.removeEventListener(event,handler);},
    toast(msg,type='info',duration=3000){
      if(!_toastContainer){
        _toastContainer=this.create('div',{className:'hd-toast-container',style:{position:'fixed',top:'70px',right:'20px',zIndex:'10000',display:'flex',flexDirection:'column',gap:'8px'}});
        document.body.appendChild(_toastContainer);
      }
      const colors={info:'var(--accent-cyan)',success:'var(--accent-green)',warning:'var(--accent-orange)',error:'var(--accent-red)'};
      const t=this.create('div',{className:`hd-toast hd-toast-${type}`,innerHTML:msg,style:{padding:'10px 18px',borderRadius:'10px',background:'var(--bg-card)',border:`1px solid ${colors[type]||colors.info}`,color:'var(--text-primary)',fontSize:'13px',fontFamily:'var(--font-body)',backdropFilter:'blur(10px)',animation:'fadeUp 0.3s ease',boxShadow:`0 0 20px ${colors[type]}22`}});
      _toastContainer.appendChild(t);
      setTimeout(()=>{t.style.opacity='0';t.style.transform='translateX(20px)';setTimeout(()=>t.remove(),300);},duration);
    },
    async modal(content,onClose){
      let overlay=document.querySelector('.hd-modal-overlay');
      if(!overlay){
        overlay=this.create('div',{className:'hd-modal-overlay',innerHTML:'<div class="hd-modal"><button class="hd-modal-close">&times;</button><div class="hd-modal-body"></div></div>',style:{position:'fixed',inset:'0',background:'rgba(0,0,0,0.82)',backdropFilter:'blur(10px)',zIndex:'1000',display:'flex',alignItems:'center',justifyContent:'center',opacity:'0',pointerEvents:'none',transition:'opacity 0.3s'}});
        document.body.appendChild(overlay);
        overlay.querySelector('.hd-modal-close').onclick=()=>this.closeModal();
        overlay.onclick=(e)=>{if(e.target===overlay)this.closeModal();};
      }
      overlay.querySelector('.hd-modal-body').innerHTML=content;
      overlay.style.opacity='1';overlay.style.pointerEvents='all';
      document.body.style.overflow='hidden';
    },
    closeModal(){
      const o=document.querySelector('.hd-modal-overlay');
      if(o){o.style.opacity='0';o.style.pointerEvents='none';document.body.style.overflow='';}
    },
    escapeHtml(str){
      if(str==null)return '';
      var div=document.createElement('div');
      div.textContent=String(str);
      return div.innerHTML;
    }
  };
})();

// ===== 7. FEATURE FLAGS =====
const FeatureFlags = (() => {
  const _flags={};
  return {
    register(flag,defaultVal=false){_flags[flag]=defaultVal;},
    enable(flag){_flags[flag]=true;EventBus.emit('feature:enabled',{flag});},
    disable(flag){_flags[flag]=false;EventBus.emit('feature:disabled',{flag});},
    isEnabled(flag){return!!_flags[flag];},
    getAll(){return{..._flags};}
  };
})();

// ===== 8. ROUTER =====
const Router = (() => {
  const _routes=new Map();
  let _current=null;
  return {
    register(path,handler){_routes.set(path,handler);},
    async navigate(path){
      if(!_routes.has(path)){console.warn(`[Router] No route: "${path}"`);return;}
      if(_current){await EventBus.emit('route:leave',{path:_current});}
      _current=path;
      await _routes.get(path)();
      await EventBus.emit('route:enter',{path});
    },
    current(){return _current;}
  };
})();

// ===== GLOBAL EXPORT =====
window.HuntDrop = {EventBus,PluginRegistry,ComponentRegistry,Config,DataLayer,UI,FeatureFlags,Router};

})();

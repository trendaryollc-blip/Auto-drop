// ============================================================================
// PLUGIN: Seasonal Content Calendar Generator
// ============================================================================
(function(){
const {PluginRegistry,UI,Config} = window.HuntDrop;
const esc = s => UI.escapeHtml(s);

let _calendar = null;
let _section = null;

const HOLIDAYS = [
  {month:0,day:1,name:"New Year's Day",emoji:"🎆",color:"#f59e0b"},
  {month:0,day:14,name:"Valentine's Prep",emoji:"💝",color:"#ec4899"},
  {month:1,day:14,name:"Valentine's Day",emoji:"❤️",color:"#ef4444"},
  {month:1,day:28,name:"Presidents' Day Sale",emoji:"🇺🇸",color:"#3b82f6"},
  {month:2,day:8,name:"International Women's Day",emoji:"👩",color:"#a855f7"},
  {month:2,day:17,name:"St. Patrick's Day",emoji:"🍀",color:"#22c55e"},
  {month:3,day:5,name:"Easter",emoji:"🐰",color:"#f472b6"},
  {month:3,day:22,name:"Earth Day",emoji:"🌍",color:"#10b981"},
  {month:4,day:12,name:"Mother's Day Prep",emoji:"💐",color:"#ec4899"},
  {month:4,day:27,name:"Memorial Day Sale",emoji:"🇺🇸",color:"#3b82f6"},
  {month:5,day:15,name:"Father's Day Prep",emoji:"👨",color:"#6366f1"},
  {month:5,day:21,name:"First Day of Summer",emoji:"☀️",color:"#f59e0b"},
  {month:6,day:4,name:"Independence Day",emoji:"🎆",color:"#ef4444"},
  {month:7,day:15,name:"Amazon Prime Day",emoji:"📦",color:"#f59e0b"},
  {month:8,day:1,name:"Labor Day Sale",emoji:"⚒️",color:"#6366f1"},
  {month:8,day:22,name:"First Day of Fall",emoji:"🍂",color:"#f97316"},
  {month:9,day:10,name:"Halloween Prep",emoji:"🎃",color:"#f97316"},
  {month:9,day:31,name:"Halloween",emoji:"👻",color:"#7c3aed"},
  {month:10,day:1,name:"Dia de los Muertos",emoji:"💀",color:"#ef4444"},
  {month:10,day:15,name:"Pre-Black Friday",emoji:"🔥",color:"#f59e0b"},
  {month:10,day:28,name:"Black Friday",emoji:"🛍️",color:"#000"},
  {month:10,day:30,name:"Cyber Monday",emoji:"💻",color:"#3b82f6"},
  {month:11,day:5,name:"Holiday Gifting",emoji:"🎄",color:"#22c55e"},
  {month:11,day:15,name:"Last-Minute Gifts",emoji:"🎁",color:"#ef4444"},
  {month:11,day:25,name:"Christmas",emoji:"🎅",color:"#dc2626"}
];

const PLATFORMS = [
  {name:"TikTok",icon:"🎵",color:"#00f2ea",bestTimes:"8-11am, 7-10pm",bestDays:"Tue, Thu, Sat",contentMix:"60% Reels, 20% Trends, 20% UGC"},
  {name:"Instagram",icon:"📸",color:"#e4405f",bestTimes:"11am-1pm, 7-9pm",bestDays:"Mon, Wed, Fri",contentMix:"40% Reels, 30% Carousels, 30% Stories"},
  {name:"Facebook",icon:"📘",color:"#1877f2",bestTimes:"1-4pm",bestDays:"Wed, Thu, Fri",contentMix:"50% Video Ads, 30% Carousel, 20% Lead Gen"},
  {name:"Pinterest",icon:"📌",color:"#e60023",bestTimes:"8-11pm",bestDays:"Sat, Sun",contentMix:"50% Idea Pins, 30% Standard, 20% Video"},
  {name:"YouTube",icon:"▶️",color:"#ff0000",bestTimes:"2-4pm",bestDays:"Thu, Fri, Sat",contentMix:"40% Shorts, 30% Reviews, 30% Unboxing"}
];

const CONTENT_TYPES = {
  tiktok: [
    {type:"Hook Video",desc:"3-5 second attention grabber",best:"8-11am, 7-10pm",difficulty:"Easy",reach:"High"},
    {type:"Tutorial",desc:"How-to using the product",best:"12-2pm",difficulty:"Medium",reach:"Medium"},
    {type:"Before/After",desc:"Transformation showcase",best:"6-9pm",difficulty:"Easy",reach:"Very High"},
    {type:"Trend Jack",desc:"Ride a trending sound/format",best:"Trending hours",difficulty:"Easy",reach:"Viral"},
    {type:"UGC Stitch",desc:"React to customer content",best:"5-8pm",difficulty:"Easy",reach:"High"},
    {type:"POV Skit",desc:"Relatable scenario with product",best:"7-10pm",difficulty:"Medium",reach:"Very High"}
  ],
  instagram: [
    {type:"Reel",desc:"Short-form video (15-30s)",best:"11am-1pm, 7-9pm",difficulty:"Medium",reach:"High"},
    {type:"Carousel",desc:"5-10 slide educational post",best:"10am-12pm",difficulty:"Hard",reach:"Medium"},
    {type:"Story Poll",desc:"Engagement-driven question",best:"9-11am",difficulty:"Easy",reach:"Low"},
    {type:"Static Post",desc:"High-quality product photo",best:"12-3pm",difficulty:"Easy",reach:"Medium"},
    {type:"Live Demo",desc:"Real-time product showcase",best:"7-9pm",difficulty:"Medium",reach:"High"},
    {type:"Collab Post",desc:"Influencer partnership",best:"11am-2pm",difficulty:"Hard",reach:"Very High"}
  ],
  facebook: [
    {type:"Video Ad",desc:"15-30s product video",best:"1-4pm",difficulty:"Medium",reach:"High"},
    {type:"Carousel Ad",desc:"Multi-image product showcase",best:"10am-12pm",difficulty:"Medium",reach:"Medium"},
    {type:"Lead Gen",desc:"Email capture with offer",best:"2-5pm",difficulty:"Medium",reach:"Medium"},
    {type:"Retargeting",desc:"Dynamic product ads",best:"6-9pm",difficulty:"Easy",reach:"High"},
    {type:"Social Proof",desc:"Review/testimonial post",best:"12-2pm",difficulty:"Easy",reach:"Medium"},
    {type:"Live Stream",desc:"Q&A or demo session",best:"7-9pm",difficulty:"Hard",reach:"High"}
  ],
  pinterest: [
    {type:"Idea Pin",desc:"Multi-page tutorial",best:"8-11pm",difficulty:"Medium",reach:"High"},
    {type:"Standard Pin",desc:"Product showcase image",best:"2-4pm",difficulty:"Easy",reach:"Medium"},
    {type:"Video Pin",desc:"Short product demo",best:"9-11pm",difficulty:"Medium",reach:"High"},
    {type:"Board Post",desc:"Lifestyle/inspiration board",best:"8-10pm",difficulty:"Easy",reach:"Medium"}
  ],
  youtube: [
    {type:"Short",desc:"60s vertical product clip",best:"12-3pm",difficulty:"Easy",reach:"Viral"},
    {type:"Review",desc:"In-depth product review",best:"2-4pm",difficulty:"Hard",reach:"High"},
    {type:"Unboxing",desc:"First impressions video",best:"10am-12pm",difficulty:"Medium",reach:"High"},
    {type:"Comparison",desc:"vs competitor products",best:"3-5pm",difficulty:"Hard",reach:"Medium"}
  ]
};

const HASHTAG_SETS = {
  electronics: ["#tech","#gadget","#techtok","#newtech","#musthave","#techreview","#smartdevice","#viral","#trending","#fyp","#techlife","#coolfinds"],
  pets: ["#pet","#dogsoftiktok","#catsoftiktok","#petlife","#petlover","#dogmom","#catmom","#furbaby","#petessential","#petcare","#petsoftiktok","#animallovers"],
  home: ["#homedecor","#homeinspo","#interiordesign","#homehacks","#cozyhome","#roomdecor","#aesthetic","#homefinds","#amazonfinds","#decor","#homeideas","#homedesign"],
  automotive: ["#car","#cartok","#caraccessories","#carhacks","#carlife","#driving","#autolife","#carmods","#carinterior","#carlovers","#carstagram","#cardiy"],
  beauty: ["#beauty","#makeup","#beautytok","#skincareroutine","#beautyhacks","#glowup","#makeuptips","#cleanbeauty","#beautyfinds","#viral","#beautycare","#skincare"],
  health: ["#health","#wellness","#fitness","#posturecorrector","#ergonomic","#wfh","#healthylifestyle","#selfcare","#backpain","#wellnesstips","#fitnesstok","#healthyliving"]
};

const CATEGORY_MAP = {"Electronics":"electronics","Pets":"pets","Home & Garden":"home","Automotive":"automotive","Health & Beauty":"beauty"};
const PostureKeywords = ["posture","neck","back","ergonomic","office","wfh"];
const PROJECTOR_KEYWORDS = ["projector","cinema","movie","home theater"];

function matchCategory(product) {
  const cat = CATEGORY_MAP[product.category];
  if (cat) return cat;
  const title = product.title.toLowerCase();
  if (PostureKeywords.some(k=>title.includes(k))) return "health";
  if (PROJECTOR_KEYWORDS.some(k=>title.includes(k))) return "home";
  return "electronics";
}

function getHolidayForDate(date) {
  const m = date.getMonth(), d = date.getDate();
  return HOLIDAYS.find(h=>h.month===m&&Math.abs(h.day-d)<=3)||null;
}

function generateCalendar(product) {
  const cal=[], now=new Date(), cat=matchCategory(product), hashtags=HASHTAG_SETS[cat]||HASHTAG_SETS.electronics;
  const weekDays=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  for(let i=0;i<90;i++){
    const date=new Date(now); date.setDate(date.getDate()+i);
    const dayOfWeek=date.getDay(), holiday=getHolidayForDate(date);
    const platform=PLATFORMS[i%PLATFORMS.length];
    const types=CONTENT_TYPES[platform.name.toLowerCase()]||CONTENT_TYPES.tiktok;
    const contentType=types[i%types.length];
    const isWeekend=dayOfWeek===0||dayOfWeek===6;
    cal.push({
      day:i+1, date, dateStr:(date.getMonth()+1)+"/"+date.getDate(), dayName:weekDays[dayOfWeek],
      platform, contentType, hook:generateHook(product,holiday,contentType.type,cat),
      caption:generateCaption(product,holiday,platform.name,hashtags),
      hashtags:shuffleHashtags(hashtags,5), holiday, isWeekend, isToday:i===0,
      urgency:i<3?"post-today":i<7?"this-week":"scheduled"
    });
  }
  return cal;
}

function generateHook(product,holiday,type,_cat){
  const name=product.title.split("—")[0].trim();
  const shortName=name.length>30?name.substring(0,30):name;
  const kw=product.keywords[0]||"product";
  const hooks={
    "Hook Video":["POV: You finally found the "+kw+" that actually works","Stop scrolling — this "+kw+" is a game changer","I can't believe this costs only $"+product.price.toFixed(2),"The "+kw+" everyone on TikTok is buying","Wait for it... the "+kw+" transformation"],
    "Tutorial":["How to get the most out of your "+shortName,"3 ways to use your "+kw+" you didn't know","Step-by-step "+kw+" setup guide","The right way to use a "+kw],
    "Before/After":["Before vs After using "+shortName,"The difference is INSANE — "+kw+" results","Day 1 vs Day 30 with my "+kw,"Watch this transformation with "+shortName],
    "Trend Jack":["Everyone's doing the "+kw+" challenge","Trying the viral "+kw+" trend","The "+kw+" trend is everywhere — here's why"],
    "UGC Stitch":["Stitching this customer's reaction to "+shortName,"This review of "+shortName+" is everything","Real people, real results with "+kw],
    "POV Skit":["POV: You finally upgraded your "+kw,"POV: Your friend asks where you got your "+kw,"POV: You're the only one with a "+kw],
    "Reel":["✨ The "+kw+" everyone's been asking about","This "+kw+" is worth every penny","Unboxing the "+shortName+" — honest review","The "+kw+" trend is REAL"],
    "Carousel":["5 reasons you need a "+kw+" in your life","The complete guide to "+kw+" — swipe for tips",""+kw.charAt(0).toUpperCase()+kw.slice(1)+" 101: Everything you need to know","Do's and Don'ts of "+kw],
    "Story Poll":["Have you tried a "+kw+"? YES / NOT YET","What's your biggest "+kw+" struggle?","Rate your "+kw+" setup 1-10"],
    "Static Post":["The "+shortName+" that's breaking the internet 🌐","Your new favorite "+kw+" has arrived","Sleek. Functional. Affordable. Meet your new "+kw],
    "Live Demo":["LIVE: Testing "+shortName+" — ask me anything!","Going live to show you why this "+kw+" is special","Live Q&A: Everything about "+shortName],
    "Collab Post":["Partnered with @"+kw.replace(/\s/g,"")+"fan to bring you this review","Collab: Our take on the "+shortName],
    "Video Ad":["🔥 Don't buy a "+kw+" until you see this","The #1 "+kw+" of 2026 — here's why","This "+kw+" pays for itself in "+Math.ceil(product.price/product.cpaAvg)+" days"],
    "Carousel Ad":["Why 10,000+ people chose this "+kw,"Before you buy ANY "+kw+", read this","The "+kw+" comparison chart you need"],
    "Lead Gen":["Get our FREE "+kw+" buying guide","Exclusive "+kw+" deal — enter email to unlock","Free shipping on "+shortName+" — limited time"],
    "Retargeting":["Still thinking about the "+shortName+"? It's selling fast","You viewed "+shortName+" — here's 15% off","Your "+kw+" is waiting — don't miss out"],
    "Social Proof":[""+product.reviews.toLocaleString()+" people can't be wrong about this "+kw,"⭐⭐⭐⭐⭐ — See why "+product.orders+" people ordered this "+kw,"This "+kw+" has a "+product.rating+"★ rating for a reason"],
    "Live Stream":["LIVE: "+shortName+" — Everything you want to know","Going live to demo "+kw+" — drop your questions!","Live "+kw+" Q&A + exclusive discount code"],
    "Idea Pin":["The ultimate "+kw+" guide — save this!","5 "+kw+" hacks you NEED to know",""+kw.charAt(0).toUpperCase()+kw.slice(1)+" inspo for your home"],
    "Standard Pin":["Shop the "+shortName+" — link in description","The "+kw+" of your dreams ✨","Upgrade your "+kw+" game"],
    "Video Pin":["Watch: "+shortName+" in action","The "+kw+" everyone's pinning right now"],
    "Board Post":[""+kw.charAt(0).toUpperCase()+kw.slice(1)+" inspiration board","My "+kw+" wishlist"],
    "Short":["The "+kw+" that went viral for a reason","60 seconds to change how you think about "+kw,""+kw.charAt(0).toUpperCase()+kw.slice(1)+" — too good not to share"],
    "Review":["Honest "+shortName+" review — is it worth it?","I tested "+shortName+" for 30 days — here's my verdict",""+kw.charAt(0).toUpperCase()+kw.slice(1)+" deep dive review"],
    "Unboxing":["Unboxing the "+shortName+" — first impressions!","What's inside the "+kw+" package?","The "+kw+" unboxing you've been waiting for"],
    "Comparison":[""+shortName+" vs the competition — which wins?","I compared the top 5 "+kw+" — here's the winner","The "+kw+" showdown: which is best?"]
  };
  let hook=(hooks[type]||hooks["Hook Video"])[Math.floor(Math.random()*(hooks[type]||hooks["Hook Video"]).length)];
  if(holiday) hook=holiday.emoji+" "+holiday.name+" special: "+hook;
  return hook;
}

function generateCaption(product,holiday,platform,_hashtags){
  const caps={
    "TikTok":"This "+product.keywords[0]+" is going viral for a reason 🔥 Only $"+product.price.toFixed(2)+" — link in bio before it sells out! "+product.rating+"★ from "+product.reviews.toLocaleString()+" reviews",
    "Instagram":"Your new favorite "+product.keywords[0]+" has arrived ✨ Premium quality at factory prices. Tap to shop 👆\n\n"+product.rating+"★ rated • "+product.orders+" orders • Free shipping",
    "Facebook":"🔥 TOP SELLER: "+product.title.split("—")[0].trim()+"\n\n✅ "+product.rating+"★ Rating\n✅ "+product.reviews.toLocaleString()+" Reviews\n✅ Free Shipping\n✅ 30-Day Guarantee\n\nOnly $"+product.price.toFixed(2)+" — limited stock!",
    "Pinterest":product.title.split("—")[0].trim()+" — The must-have "+product.keywords[0]+" for 2026. Shop now for $"+product.price.toFixed(2),
    "YouTube":"In this video I'm reviewing the "+product.title.split("—")[0].trim()+". Is it worth the hype? Let's find out. Links in description 👇"
  };
  let base=caps[platform]||caps["TikTok"];
  if(holiday) base=holiday.emoji+" "+holiday.name+" Special! "+base;
  return base;
}

function shuffleHashtags(arr,count){
  const copy=arr.slice(),result=[];
  for(let i=0;i<Math.min(count,copy.length);i++){
    const idx=Math.floor(Math.random()*copy.length);
    result.push(copy.splice(idx,1)[0]);
  }
  return result;
}

function generateFn(query){
  if(!query||!query.trim()) return;
  const products=window.HuntDrop.ALL_PRODUCTS||[];
  const match=products.find(p=>
    p.title.toLowerCase().includes(query.toLowerCase())||
    p.keywords.some(k=>k.toLowerCase().includes(query.toLowerCase()))
  )||products.sort((a,b)=>b.score-a.score)[0];
  if(!match) return;
  _calendar=generateCalendar(match);
  renderFn(match);
}

function renderFn(_product){
  const cal=_calendar;
  const el=_section?_section.querySelector('#ccResults'):null;
  if(!el||!cal) return;

  const todayPosts=cal.filter(d=>d.isToday||d.urgency==="post-today");
  const thisWeek=cal.filter(d=>d.urgency==="post-today"||d.urgency==="this-week");
  const holidays=cal.filter(d=>d.holiday);
  const platformBreakdown={};
  cal.forEach(d=>{const n=d.platform.name;platformBreakdown[n]=(platformBreakdown[n]||0)+1;});

  el.innerHTML=`
      <!-- Summary Stats -->
      <div class="cc-summary-row">
        <div class="cc-summary-card cc-sum-red"><div class="cc-sum-icon">⚡</div><div class="cc-sum-val">${todayPosts.length}</div><div class="cc-sum-label">Post Today</div></div>
        <div class="cc-summary-card cc-sum-orange"><div class="cc-sum-icon">📅</div><div class="cc-sum-val">${thisWeek.length}</div><div class="cc-sum-label">This Week</div></div>
        <div class="cc-summary-card cc-sum-green"><div class="cc-sum-icon">🎄</div><div class="cc-sum-val">${holidays.length}</div><div class="cc-sum-label">Holiday Events</div></div>
        <div class="cc-summary-card cc-sum-purple"><div class="cc-sum-icon">📊</div><div class="cc-sum-val">${cal.length}</div><div class="cc-sum-label">Total Days</div></div>
      </div>

      <!-- Urgency Banner -->
      <div class="cc-urgency-banner" id="ccUrgencyBanner"></div>

      <!-- Platform Strategy Cards -->
      <div class="cc-section">
        <h3>📱 Platform Strategy</h3>
        <p class="cc-section-sub">Optimized posting schedule for each platform</p>
        <div class="cc-platform-strategy-grid">
          ${PLATFORMS.map(p=>`
            <div class="cc-strat-card" style="border-top:3px solid ${p.color}">
              <div class="cc-strat-header">
                <span class="cc-strat-icon">${esc(p.icon)}</span>
                <span class="cc-strat-name">${esc(p.name)}</span>
                <span class="cc-strat-count">${platformBreakdown[p.name]||0} posts</span>
              </div>
              <div class="cc-strat-details">
                <div class="cc-strat-row"><span class="cc-strat-label">⏰ Best Times</span><span class="cc-strat-val">${p.bestTimes}</span></div>
                <div class="cc-strat-row"><span class="cc-strat-label">📅 Best Days</span><span class="cc-strat-val">${p.bestDays}</span></div>
                <div class="cc-strat-row"><span class="cc-strat-label">🎯 Content Mix</span><span class="cc-strat-val">${p.contentMix}</span></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Content Types Overview -->
      <div class="cc-section">
        <h3>🎯 Content Types by Platform</h3>
        <p class="cc-section-sub">30+ content types with difficulty and reach ratings</p>
        <div class="cc-content-type-grid">
          ${PLATFORMS.map(p=>{
            const types=CONTENT_TYPES[p.name.toLowerCase()]||[];
            return `
            <div class="cc-type-card">
              <div class="cc-type-header" style="background:${p.color}15;border-left:3px solid ${p.color}">
                <span>${esc(p.icon)}</span><span>${esc(p.name)}</span>
              </div>
              <div class="cc-type-list">
                ${types.map(t=>`
                  <div class="cc-type-item">
                    <div class="cc-type-name">${esc(t.type)}</div>
                    <div class="cc-type-desc">${esc(t.desc)}</div>
                    <div class="cc-type-meta">
                      <span class="cc-type-badge cc-diff-${t.difficulty.toLowerCase()}">${t.difficulty}</span>
                      <span class="cc-type-badge cc-reach-${t.reach.toLowerCase().replace(' ','')}">${t.reach}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Calendar Tabs -->
      <div class="cc-tabs">
        <button class="cc-tab active" data-view="calendar">📅 Calendar View</button>
        <button class="cc-tab" data-view="list">📋 List View</button>
        <button class="cc-tab" data-view="platforms">📱 By Platform</button>
      </div>
      <div class="cc-tab-panels">
        <div class="cc-panel cc-panel-calendar active" id="ccPanelCalendar"></div>
        <div class="cc-panel cc-panel-list" id="ccPanelList"></div>
        <div class="cc-panel cc-panel-platforms" id="ccPanelPlatforms"></div>
      </div>

      <!-- Holiday Calendar -->
      <div class="cc-section">
        <h3>🎄 Holiday Content Calendar</h3>
        <p class="cc-section-sub">Key dates to plan your content around</p>
        <div class="cc-holiday-grid">
          ${holidays.map(h=>`
            <div class="cc-holiday-card" style="border-left:3px solid ${h.color}">
              <div class="cc-holiday-emoji">${esc(h.holiday.emoji)}</div>
              <div class="cc-holiday-info">
                <div class="cc-holiday-name">${esc(h.holiday.name)}</div>
                <div class="cc-holiday-date">${esc(h.dateStr)} ${esc(h.dayName)}</div>
                <div class="cc-holiday-platform" style="color:${h.platform.color}">${esc(h.platform.icon)} ${esc(h.platform.name)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Content Mix Stats -->
      <div class="cc-section">
        <h3>📊 Content Mix Analysis</h3>
        <div class="cc-mix-grid">
          ${PLATFORMS.map(p=>{
            const count=platformBreakdown[p.name]||0;
            const pct=Math.round(count/cal.length*100);
            return `
            <div class="cc-mix-card">
              <div class="cc-mix-header">
                <span>${esc(p.icon)} ${esc(p.name)}</span>
                <span class="cc-mix-pct">${pct}%</span>
              </div>
              <div class="cc-mix-bar"><div class="cc-mix-fill" style="width:${pct}%;background:${p.color}"></div></div>
              <div class="cc-mix-count">${count} posts in 90 days</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Detail Panel -->
      <div id="ccDetailPanel" class="cc-detail-panel"></div>
    `;

  renderUrgencyFn(todayPosts);
  renderCalendarViewFn(cal);
  renderListViewFn(cal);
  renderPlatformViewFn(cal,platformBreakdown);
  setupTabsFn();
  bindCardClicksFn(cal);
}

function renderUrgencyFn(todayPosts){
  const el=_section?.querySelector('#ccUrgencyBanner');
  if(!el) return;
  if(!todayPosts.length){
    el.innerHTML='<div class="cc-urgency cc-urgency-none">✅ No urgent posts — your next post is scheduled.</div>';
    return;
  }
  el.innerHTML=todayPosts.map(p=>`
      <div class="cc-urgency cc-urgency-active">
        <span class="cc-urgency-icon">⚡</span>
        <span class="cc-urgency-text">POST TODAY on <strong>${esc(p.platform.name)}</strong> — ${esc(p.contentType.type)}: "${esc(p.hook)}"</span>
      </div>
    `).join('');
}

function renderCalendarViewFn(cal){
  const el=_section?.querySelector('#ccPanelCalendar');
  if(!el) return;
  const months=["January","February","March","April","May","June","July","August","September","October","November","December"];
  let html='', currentMonth=-1;
  cal.forEach((day,i)=>{
    const m=day.date.getMonth();
    if(m!==currentMonth){currentMonth=m;html+=`<div class="cc-month-header">${months[m]} ${day.date.getFullYear()}</div>`;}
    const classes=['cc-day-card'];
    if(day.isToday) classes.push('cc-day-today');
    if(day.holiday) classes.push('cc-day-holiday');
    if(day.isWeekend) classes.push('cc-day-weekend');
    html+=`<div class="${classes.join(' ')}" tabindex="0" role="button" aria-label="Day ${day.day}: ${day.contentType.type} on ${day.platform.name}" data-idx="${i}">
        <div class="cc-day-top">
          <span class="cc-day-date">${esc(day.dateStr)}</span>
          <span class="cc-day-name">${esc(day.dayName)}</span>
          ${day.holiday?`<span class="cc-day-holiday-badge" title="${esc(day.holiday.name)}">${esc(day.holiday.emoji)}</span>`:''}
        </div>
        <div class="cc-day-platform" style="color:${day.platform.color}">${esc(day.platform.icon)} ${esc(day.platform.name)}</div>
        <div class="cc-day-type">${esc(day.contentType.type)}</div>
        <div class="cc-day-hook">${esc(day.hook)}</div>
        <div class="cc-day-footer">
          <span class="cc-day-time">⏰ ${day.contentType.best}</span>
          <span class="cc-day-diff cc-diff-${day.contentType.difficulty.toLowerCase()}">${day.contentType.difficulty}</span>
        </div>
        <div class="cc-day-view">View Details →</div>
      </div>`;
  });
  el.innerHTML=html;
  el.querySelectorAll('.cc-day-card').forEach(card=>{
    const handler=()=>{const idx=parseInt(card.dataset.idx);showDetailFn(cal[idx]);};
    card.addEventListener('click',handler);
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handler();}});
  });
}

function renderListViewFn(cal){
  const el=_section?.querySelector('#ccPanelList');
  if(!el) return;
  el.innerHTML=`<div class="cc-list">${cal.map((day,i)=>{
    const tags=day.hashtags.map(h=>`<span class="cc-tag">${esc(h)}</span>`).join('');
    return `<div class="cc-list-item${day.isToday?' cc-list-today':''}" tabindex="0" role="button" aria-label="Day ${day.day}: ${day.contentType.type} on ${day.platform.name}" data-idx="${i}">
        <div class="cc-list-left">
          <div class="cc-list-day">Day ${day.day}</div>
          <div class="cc-list-date">${esc(day.dateStr)} ${esc(day.dayName)}</div>
        </div>
        <div class="cc-list-center">
          <div class="cc-list-platform" style="color:${day.platform.color}">${esc(day.platform.icon)} ${esc(day.platform.name)} — ${esc(day.contentType.type)}</div>
          <div class="cc-list-hook">${esc(day.hook)}</div>
          <div class="cc-list-caption">${esc(day.caption)}</div>
          <div class="cc-list-tags">${tags}</div>
        </div>
        <div class="cc-list-right">
          ${day.holiday?`<span class="cc-list-holiday">${esc(day.holiday.emoji)}</span>`:''}
          <span class="cc-list-time">⏰ ${day.contentType.best}</span>
          <span class="cc-type-badge cc-diff-${day.contentType.difficulty.toLowerCase()}">${day.contentType.difficulty}</span>
          <span class="cc-list-view">View →</span>
        </div>
      </div>`;
  }).join('')}</div>`;
  el.querySelectorAll('.cc-list-item').forEach(item=>{
    const handler=()=>{const idx=parseInt(item.dataset.idx);showDetailFn(cal[idx]);};
    item.addEventListener('click',handler);
    item.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handler();}});
  });
}

function renderPlatformViewFn(cal,_breakdown){
  const el=_section?.querySelector('#ccPanelPlatforms');
  if(!el) return;
  el.innerHTML=`<div class="cc-platform-grid">${PLATFORMS.map(pl=>{
    const posts=cal.filter(d=>d.platform.name===pl.name);
    return `<div class="cc-platform-card" tabindex="0" role="button" aria-label="View ${pl.name} content in Ad Studio" data-platform="${esc(pl.name)}" style="border-top:3px solid ${pl.color}">
        <div class="cc-platform-header">
          <span class="cc-platform-icon">${esc(pl.icon)}</span>
          <span class="cc-platform-name">${esc(pl.name)}</span>
          <span class="cc-platform-count">${posts.length} posts</span>
        </div>
        <div class="cc-platform-posts">
          ${posts.slice(0,5).map(p=>`
            <div class="cc-platform-post">
              <span class="cc-pp-date">${esc(p.dateStr)}</span>
              <span class="cc-pp-type">${esc(p.contentType.type)}</span>
              <span class="cc-pp-hook">${esc(p.hook.substring(0,60))}${p.hook.length>60?'...':''}</span>
            </div>
          `).join('')}
          ${posts.length>5?`<div class="cc-platform-more">+${posts.length-5} more posts</div>`:''}
        </div>
        <div class="cc-platform-cta">Create ${esc(pl.name)} Ads →</div>
      </div>`;
  }).join('')}</div>`;
  el.querySelectorAll('.cc-platform-card').forEach(card=>{
    const handler=()=>{window.HuntDrop.navigateTo('section-ad-studio');};
    card.addEventListener('click',handler);
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handler();}});
  });
}

function showDetailFn(day){
  const panel=_section?.querySelector('#ccDetailPanel');
  if(!panel||!day) return;
  const tags=day.hashtags.map(h=>`<span class="cc-detail-tag">${esc(h)}</span>`).join('');
  panel.innerHTML=`
      <div class="cc-detail-overlay" id="ccDetailClose"></div>
      <div class="cc-detail-content">
        <button class="cc-detail-close" id="ccDetailCloseBtn" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div class="cc-detail-hero" style="border-left:4px solid ${day.platform.color}">
          <div class="cc-detail-hero-info">
            <div class="cc-detail-day-badge">Day ${day.day}</div>
            <h2 class="cc-detail-title">${esc(day.contentType.type)}</h2>
            <div class="cc-detail-meta">${esc(day.dateStr)} ${esc(day.dayName)} • <span style="color:${day.platform.color}">${esc(day.platform.icon)} ${esc(day.platform.name)}</span></div>
            <div class="cc-detail-badges">
              <span class="cc-detail-badge cc-diff-${day.contentType.difficulty.toLowerCase()}">${day.contentType.difficulty}</span>
              <span class="cc-detail-badge cc-reach-${day.contentType.reach.toLowerCase().replace(' ','')}">${day.contentType.reach} Reach</span>
              ${day.holiday?`<span class="cc-detail-badge cc-detail-holiday-badge">${esc(day.holiday.emoji)} ${esc(day.holiday.name)}</span>`:''}
            </div>
          </div>
        </div>
        <div class="cc-detail-grid">
          <div class="cc-detail-card">
            <h4>🎣 Hook</h4>
            <div class="cc-detail-hook">"${esc(day.hook)}"</div>
          </div>
          <div class="cc-detail-card">
            <h4>📝 Caption</h4>
            <div class="cc-detail-caption">${esc(day.caption)}</div>
          </div>
          <div class="cc-detail-card">
            <h4>#️⃣ Hashtags</h4>
            <div class="cc-detail-tags">${tags}</div>
          </div>
          <div class="cc-detail-card">
            <h4>📋 Details</h4>
            <div class="cc-detail-metrics">
              <div class="cc-detail-m"><span>Content Type</span><span>${esc(day.contentType.type)}</span></div>
              <div class="cc-detail-m"><span>Description</span><span>${esc(day.contentType.desc)}</span></div>
              <div class="cc-detail-m"><span>Best Time</span><span>${esc(day.contentType.best)}</span></div>
              <div class="cc-detail-m"><span>Difficulty</span><span>${esc(day.contentType.difficulty)}</span></div>
              <div class="cc-detail-m"><span>Expected Reach</span><span>${esc(day.contentType.reach)}</span></div>
              <div class="cc-detail-m"><span>Platform</span><span style="color:${day.platform.color}">${esc(day.platform.icon)} ${esc(day.platform.name)}</span></div>
            </div>
          </div>
        </div>
        <div class="cc-detail-actions">
          <button class="cc-detail-btn cc-detail-primary" onclick="window.HuntDrop.navigateTo('section-ad-studio')">🎬 Create Ad for ${esc(day.platform.name)}</button>
          <button class="cc-detail-btn" onclick="window.HuntDrop.navigateTo('section-personas')">👤 Audience Research</button>
          <button class="cc-detail-btn" onclick="window.HuntDrop.navigateTo('section-budget')">📊 Plan Budget</button>
        </div>
      </div>`;
  panel.classList.add('cc-detail-open');
  const closeBtn=panel.querySelector('#ccDetailCloseBtn');
  const overlay=panel.querySelector('#ccDetailClose');
  const closeDetail=()=>{panel.classList.remove('cc-detail-open');panel.innerHTML='';};
  if(closeBtn) closeBtn.addEventListener('click',closeDetail);
  if(overlay) overlay.addEventListener('click',closeDetail);
}

function bindCardClicksFn(_cal){
  if(!_section) return;
  _section.querySelectorAll('.cc-strat-card').forEach(card=>{
    const handler=()=>{window.HuntDrop.navigateTo('section-ad-studio');};
    card.addEventListener('click',handler);
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handler();}});
  });
  _section.querySelectorAll('.cc-holiday-card').forEach((card,_i)=>{
    const handler=()=>{window.HuntDrop.navigateTo('section-product-hunt');};
    card.addEventListener('click',handler);
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handler();}});
  });
  _section.querySelectorAll('.cc-urgency-active').forEach(card=>{
    const handler=()=>{window.HuntDrop.navigateTo('section-ad-studio');};
    card.addEventListener('click',handler);
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handler();}});
  });
  _section.querySelectorAll('.cc-type-item').forEach(card=>{
    const handler=()=>{window.HuntDrop.navigateTo('section-ad-studio');};
    card.addEventListener('click',handler);
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handler();}});
  });
}

function setupTabsFn(){
  if(!_section) return;
  const tabs=_section.querySelectorAll('.cc-tab');
  tabs.forEach(tab=>{
    tab.addEventListener('click',()=>{
      tabs.forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      const view=tab.getAttribute('data-view') || '';
      _section.querySelectorAll('.cc-panel').forEach(p=>p.classList.remove('active'));
      const panel=_section.querySelector('#ccPanel'+view.charAt(0).toUpperCase()+view.slice(1));
      if(panel) panel.classList.add('active');
    });
  });
}

const ContentCalendarPlugin = {
  id:'content-calendar',name:'Content Planner',version:'2.0.0',
  description:'AI-generated 90-day content and ad calendar with platform-specific strategies',

  get _section() { return _section; },
  set _section(v) { _section = v; },

  init(_ctx){Config.defaults('contentCalendar',{enabled:true});},

  mount(_ctx){
    const container=UI.$('sections-container');
    if(!container) return;
    const section=document.createElement('section');
    section.className='section section-content-calendar';
    section.id='section-calendar';
    section.innerHTML=`
      <div class="section-inner">
        <div class="cc-hero">
          <div class="cc-hero-content">
            <div class="cc-hero-badge">📅 Content Intelligence</div>
            <h1 class="cc-hero-title">Seasonal Content Planner</h1>
            <p class="cc-hero-desc">AI-generated 90-day content + ad calendar with platform-specific strategies, hooks, hashtags, and posting schedules. Never run out of content ideas again.</p>
          </div>
          <div class="cc-hero-cards">
            <div class="cc-hero-card"><div class="cc-hero-card-icon">📅</div><div class="cc-hero-card-num">90</div><div class="cc-hero-card-label">Days Planned</div></div>
            <div class="cc-hero-card"><div class="cc-hero-card-icon">📱</div><div class="cc-hero-card-num">5</div><div class="cc-hero-card-label">Platforms</div></div>
            <div class="cc-hero-card"><div class="cc-hero-card-icon">🎯</div><div class="cc-hero-card-num">30+</div><div class="cc-hero-card-label">Content Types</div></div>
            <div class="cc-hero-card"><div class="cc-hero-card-icon">🎄</div><div class="cc-hero-card-num">25</div><div class="cc-hero-card-label">Holidays</div></div>
          </div>
        </div>

        <div class="cc-feat-list">
          <div class="cc-feat-item"><span class="cc-feat-icon">📱</span> 5 Platforms</div>
          <div class="cc-feat-item"><span class="cc-feat-icon">🎯</span> 30+ Content Types</div>
          <div class="cc-feat-item"><span class="cc-feat-icon">🎄</span> 25 Holiday Events</div>
          <div class="cc-feat-item"><span class="cc-feat-icon">#️⃣</span> Smart Hashtags</div>
          <div class="cc-feat-item"><span class="cc-feat-icon">✍️</span> AI Hooks & Captions</div>
          <div class="cc-feat-item"><span class="cc-feat-icon">⏰</span> Best Posting Times</div>
        </div>

        <div class="cc-input-card">
          <h3>🔍 Enter Your Product</h3>
          <div class="cc-input-row">
            <div class="cc-input-wrap">
              <svg class="cc-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input type="text" class="cc-input" id="ccInput" placeholder="Type a product keyword to generate 90-day calendar...">
              <button class="cc-generate-btn" id="ccGenerateBtn">📅 Generate Calendar</button>
            </div>
          </div>
          <div class="cc-quick-picks">
            <span class="cc-quick-label">Quick try:</span>
            <button class="cc-quick-btn" data-q="wireless earbuds">🎧 Earbuds</button>
            <button class="cc-quick-btn" data-q="pet gadgets">🐾 Pet Gadgets</button>
            <button class="cc-quick-btn" data-q="kitchen organizer">🍳 Kitchen</button>
            <button class="cc-quick-btn" data-q="posture corrector">🧍 Posture</button>
            <button class="cc-quick-btn" data-q="galaxy projector">🌌 Galaxy Light</button>
          </div>
        </div>

        <div id="ccResults"></div>

        ${window.HuntDrop.renderRelatedTools([
          { section:'section-ad-studio', name:'Ad Studio', desc:'Create ad creatives', icon:'🎯', color:'#f59e0b' },
          { section:'section-personas', name:'Customer Persona', desc:'Know your audience', icon:'👤', color:'#ec4899' },
          { section:'section-objections', name:'Objection Handler', desc:'Overcome objections', icon:'🛡️', color:'#06b6d4' },
          { section:'section-budget', name:'Ad Budget Allocator', desc:'Plan ad budget', icon:'📊', color:'#a855f7' }
        ])}
      </div>`;
    container.appendChild(section);
    _section=section;
    const btn=section.querySelector('#ccGenerateBtn');
    const input=section.querySelector('#ccInput');
    if(btn) btn.addEventListener('click',()=>generateFn(input?.value||''));
    if(input) input.addEventListener('keypress',e=>{if(e.key==='Enter')generateFn(input.value);});
    section.querySelectorAll('.cc-quick-btn').forEach(b=>{
      b.addEventListener('click',()=>{input.value=b.dataset.q;generateFn(b.dataset.q);});
    });
  },

  unmount(_ctx){if(_section){_section.remove();_section=null;} _calendar=null;}
};

PluginRegistry.register('content-calendar',ContentCalendarPlugin);
})();

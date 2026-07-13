// ============================================================================
// PLUGIN: Customer Persona Simulator
// ============================================================================
(function(){
const {EventBus,PluginRegistry,DataLayer,UI,Config} = window.HuntDrop;
const esc = s => UI.escapeHtml(s);

const PersonaTemplates = [
  {
    name:'Sarah Mitchell',age:'28-34',gender:'Female',income:'$55K-75K',location:'Suburban USA',
    avatar:'S',color:'var(--accent-pink)',
    lifestyle:'Health-conscious millennial, shops online 3-4x/week, active on Instagram & TikTok, values convenience and aesthetics',
    fears:['Wasting money on products that don\'t work','Being tricked by fake reviews','Looking foolish to friends','Buying something everyone else already has'],
    desires:['Find products that actually solve her problems','Look put-together without effort','Save time on daily routines','Discover trending products before friends'],
    buyingTriggers:['Social proof (thousands of 5-star reviews)','Before/after transformation photos','Limited-time discounts','Free shipping + easy returns','Influencer recommendations'],
    objections:['"Is this just another TikTok trend?"','"Will this actually work for ME?"','"I\'ve been burned by similar products before"','"The price seems too good to be true"'],
    persuasionAngles:['Lead with the problem she faces daily','Show real women (not models) using it','Emphasize the money-back guarantee','Create FOMO with countdown timers','Use her exact language in ad copy'],
    language:['literally obsessed','worth every penny','game changer','no brainer','add to cart immediately','okay but this is actually good','not me buying this at 2am'],
    priceRange:{low:'Under $15 = impulse buy',$mid:'$15-40 = reads reviews first',$high:'$40+ = needs strong social proof'},
    contentFormats:['Short-form video (Reels/TikTok)','Before/after carousel photos','Story polls and Q&A','Influencer try-on hauls','Customer review compilations'],
    socialProof:['Thousands of 5-star reviews','Real customer before/after photos','"As seen on TikTok" badges','Influencer unboxings','Money-back guarantee badges'],
    purchaseWindow:{best:'Evenings 8-11pm, Sunday afternoons',worst:'Monday mornings, late night 2-5am',seasonal:'Pre-holiday surges, New Year resolutions, Summer prep'},
    competitorMindset:['Checks Amazon reviews first','Compares 3-4 similar products','Waits for a sale or coupon code','Reads Reddit for honest opinions','Trusts micro-influencers over big names'],
    checkoutBehavior:{abandons:['High shipping costs','No reviews visible','Complicated checkout','No return policy shown'],completes:['One-click checkout','Apple Pay/Google Pay','Free shipping threshold','Clear return policy','Order confirmation with tracking']},
    fbTargeting:{age:'25-44',interests:['Online Shopping','Beauty Tools','Home Organization','Fitness Gadgets','Kitchen Innovations'],behaviors:['Engaged Shoppers','Online Buyers','Mobile Buyers'],countries:['US','UK','CA','AU']},
    tiktokTargeting:{age:'18-34',interests:['Life Hacks','Product Reviews','ASMR','Satisfying Videos'],behaviors:['Commenters','Savers','Share Creators']},
    adCopy:'Stop wasting money on products that promise everything and deliver nothing. This ${product} has helped 12,847 women save time every single morning. See why it\'s selling out →'
  },
  {
    name:'Jason Park',age:'22-30',gender:'Male',income:'$45K-65K',location:'Urban USA',
    avatar:'J',color:'var(--accent-cyan)',
    lifestyle:'Tech-savvy gamer and gadget enthusiast, watches YouTube reviews before buying, active on Reddit and Twitter, values performance and novelty',
    fears:['Buying an inferior product','Missing out on the latest tech','Overpaying for something basic','Getting called out for a bad purchase'],
    desires:['Own the coolest tech before anyone else','Optimize his daily setup','Impress friends with unique finds','Find hidden gems at good prices'],
    buyingTriggers:['Unboxing videos and reviews','Technical specs and benchmarks','Early-adopter pricing','Community validation (Reddit upvotes)','Unique/innovative design'],
    objections:['"I can probably find this cheaper on AliExpress"','"Is this actually better than [competitor]?"','"The specs don\'t look that impressive"','"I don\'t trust paid reviews"'],
    persuasionAngles:['Lead with technical innovation','Compare directly to competitors','Show it in a real desk/setup environment','Use Reddit-style social proof','Offer bundle deals with accessories'],
    language:['honestly pretty solid','bang for buck','peak performance','this slaps','no cap this is fire','underrated af','specs don\'t lie'],
    priceRange:{low:'Under $20 = instant cop',$mid:'$20-60 = checks r/BuyItForLife',$high:'$60+ = needs video review proof'},
    contentFormats:['YouTube unboxing/review','Reddit comparison posts','Tech benchmark videos','Desk setup tours','Side-by-side comparison reels'],
    socialProof:['Reddit thread recommendations','YouTube review consensus','Spec comparison charts','Community upvotes','"Best of 2026" list placements'],
    purchaseWindow:{best:'Weekday evenings 7-10pm, Saturday afternoons',worst:'Sunday mornings, work hours 9-5',seasonal:'Product launch cycles, Black Friday, Prime Day'},
    competitorMindset:['Always comparing specs','Reads every review on multiple platforms','Watches 3+ YouTube reviews before buying','Checks AliExpress/Temu for cheaper versions','Values brand reputation and warranty'],
    checkoutBehavior:{abandons:['Slow page load','No spec details listed','No comparison to alternatives','Only PayPal available'],completes:['Detailed product specs','Comparison tables','Multiple payment options','Fast shipping options','Clear warranty info']},
    fbTargeting:{age:'18-35',interests:['Tech Gadgets','Gaming Setup','Smart Home','EDC Gear','Phone Accessories'],behaviors:['Tech Early Adopters','Online Spend: High'],countries:['US','UK','CA']},
    tiktokTargeting:{age:'18-28',interests:['Tech Reviews','Gadget Unboxing','Desk Setup','Gaming'],behaviors:['High Engagement','Commenters']},
    adCopy:'This ${product} is the gadget nobody\'s talking about yet — but everyone will be. 2,400+ orders this month. Don\'t be the last to find out →'
  },
  {
    name:'Maria Rodriguez',age:'35-45',gender:'Female',income:'$65K-95K',location:'Suburban USA',
    avatar:'M',color:'var(--accent-orange)',
    lifestyle:'Busy working mom, shops for the whole family, values practicality and durability, reads Amazon reviews thoroughly, active on Facebook groups',
    fears:['Wasting money on junk','Products that break after a week','Feeling like she\'s being scammed online','Not getting good value for the family budget'],
    desires:['Make family life easier and more organized','Find products that last','Save money without sacrificing quality','Keep kids happy and entertained'],
    buyingTriggers:['Amazon reviews (1000+ verified)','Parent blogger recommendations','Money-back guarantee','Practical demonstrations','Multi-use/value bundles'],
    objections:['"This looks cheap — will it last?"','"I can\'t afford to waste money right now"','"My kids will break this in a week"','"Why should I trust this over a known brand?"'],
    persuasionAngles:['Lead with family-specific use cases','Show durability tests','Highlight cost-per-use savings','Use mom-community testimonials','Offer family bundles at discount'],
    language:['need this for the house','such a lifesaver','finally something that works','my kids love it','worth every penny for the family','got this for the whole house','practical and sturdy'],
    priceRange:{low:'Under $20 = yes please',$mid:'$20-50 = checks reviews carefully',$high:'$50+ = needs durability guarantee'},
    contentFormats:['Facebook group testimonials','Amazon review screenshots','Mom blogger recommendations','Before/after home photos','Family use demonstration videos'],
    socialProof:['1000+ verified Amazon reviews','Mom blogger endorsements','"Mom approved" badges','Durability test videos','Money-back guarantee prominently displayed'],
    purchaseWindow:{best:'Nap time 1-3pm, after bedtime 9-11pm',worst:'Morning rush 7-9am, during work hours',seasonal:'Back-to-school, holidays, spring cleaning'},
    competitorMindset:['Checks Amazon first, reads top 50 reviews','Asks in Facebook mom groups','Compares durability and warranty','Looks for family bundle deals','Trusts other moms over influencers'],
    checkoutBehavior:{abandons:['No reviews visible','Unclear return policy','Complicated shipping options','No family bundle available'],completes:['Amazon-style review section','Clear return policy','Free shipping','Bundle discount visible','Trust badges displayed']},
    fbTargeting:{age:'30-50',interests:['Mom Life','Family Organization','Budget Shopping','Home Hacks','Kids Activities'],behaviors:['Parents with Young Children','Online Shoppers'],countries:['US','UK','CA','AU']},
    tiktokTargeting:{age:'25-45',interests:['MomTok','Parenting Tips','Home Organization','Family Hacks'],behaviors:['Savers','Share Creators']},
    adCopy:'Every mom needs this in her kitchen. It\'s saved me 30 minutes every single day — and it\'s under $25. 8,400+ 5-star reviews from other moms say the same →'
  },
  {
    name:'Alex Thompson',age:'19-26',gender:'Non-Binary',income:'$30K-50K',location:'Urban USA',
    avatar:'A',color:'var(--accent-purple)',
    lifestyle:'Gen Z trendsetter, discovers products through TikTok, aesthetic-focused, values sustainability and uniqueness, impulse buyer with strong FOMO',
    fears:['Being basic or basic','Supporting unethical brands','Products that don\'t match the aesthetic','Missing a viral trend'],
    desires:['Curate a unique personal aesthetic','Support eco-friendly brands','Find products that look expensive but aren\'t','Share discoveries with community'],
    buyingTriggers:['TikTok viral products','Aesthetic product photography','Sustainability claims','Creator/influencer endorsements','Limited edition drops'],
    objections:['"This is just another dropshipping scam"','"The aesthetic looks different in real life"','"Is this actually sustainable or greenwashing?"','"I saw this on TikTok last month already"'],
    persuasionAngles:['Lead with aesthetic/lifestyle imagery','Emphasize sustainability credentials','Show unfiltered real-life usage','Create exclusive/limited feel','Use Gen Z language and humor'],
    language:['the aesthetic is immaculate','periodt','slay','caught me at "sustainable"','this is giving what it\'s supposed to give','not me wanting everything','vibes only'],
    priceRange:{low:'Under $15 = no thoughts just vibes',$mid:'$15-35 = checks if it\'s "worth"',$high:'$35+ = needs aesthetic proof and reviews'},
    contentFormats:['TikTok GRWM videos','Aesthetic flat lay photos','Sustainability story highlights','Unfiltered real-life reels','Creator "day in my life" content'],
    socialProof:['TikTok viral count','Sustainability certifications','Creator collaborations','"10K+ people bought this"','User-generated aesthetic photos'],
    purchaseWindow:{best:'Late night 10pm-1am, weekend afternoons',worst:'Early mornings, weekday work hours',seasonal:'Viral trend cycles, festival season, holiday gifting'},
    competitorMindset:['Compares aesthetics across platforms','Checks if it\'s "TikTok famous"','Looks for sustainability proof','Reads comments for real opinions','Compares to similar viral products'],
    checkoutBehavior:{abandons:['Ugly product page','No lifestyle photos','No sustainability info','Standard shipping only'],completes:['Aesthetic product page','Lifestyle imagery','Eco-friendly shipping option','Social media login checkout','Limited stock indicator']},
    fbTargeting:{age:'18-28',interests:['Aesthetic Lifestyle','Sustainable Living','Thrift Finds','Art & Design','Minimalism'],behaviors:['Mobile Buyers','Social Media Active'],countries:['US','UK','AU','CA']},
    tiktokTargeting:{age:'18-24',interests:['Aesthetic','Room Decor','Sustainable Finds','GRWM','Haul'],behaviors:['High Comment Rate','Share Creators']},
    adCopy:'POV: you found the ${product} that matches your entire aesthetic AND it\'s sustainable. 6,200 people agree → Link in bio before it sells out'
  }
];

const ProductPersonas = {
  'wireless earbuds':{triggers:['Noise cancellation for focus','Gym-ready fit','Battery life anxiety'],objections:['"AirPods are better"','"These will fall out"'],angles:['Compare to $200 earbuds','Show workout footage','Battery life comparison chart'],keywords:['earbuds','headphones','airpods','buds']},
  'pet gadgets':{triggers:['Pet parent guilt','Want the best for fur baby','Convenience for busy owners'],objections:['"My pet won\'t use this"','"Is this safe?"'],angles:['Show pet reactions','Vet endorsement angle','Convenience pitch'],keywords:['pet','dog','cat','pet gadget']},
  'kitchen organizer':{triggers:['Kitchen chaos frustration','Instagram-worthy kitchen','Meal prep efficiency'],objections:['"My kitchen is too small"','"I\'ll never keep it organized"'],angles:['Before/after transformation','Small kitchen solutions','Time-saving pitch'],keywords:['kitchen','organizer','storage','cabinet']},
  'posture corrector':{triggers:['WFH back pain','Looking confident','Preventing long-term damage'],objections:['"I\'ll forget to wear it"','"Those braces look uncomfortable"'],angles:['Doctor recommendation','Before/after posture shots','Discreet under clothes'],keywords:['posture','back','corrector','brace']},
  'galaxy projector':{triggers:['Room aesthetic transformation','Unique gift idea','Movie night vibes'],objections:['"Will it actually look good?"','"Is it bright enough?"'],angles:['Room transformation reveal','Date night setup','Gift guide placement'],keywords:['galaxy','projector','star','light','ambient']},
  'beauty tool':{triggers:['Salon results at home','Time-saving routine','Instagram-ready look'],objections:['"I\'m not skilled enough"','"This looks complicated"'],angles:['5-minute transformation','Celebrity routine angle','Beginner-friendly pitch'],keywords:['beauty','skin','face','facial','skincare']},
  'fitness gadget':{triggers:['Home gym upgrade','Accountability tool','Visible progress tracking'],objections:['"I can do this without equipment"','"Gym membership is better"'],angles:['Results comparison','Home vs gym convenience','Progress photos'],keywords:['fitness','gym','workout','muscle','exercise']},
  'phone accessories':{triggers:['Phone protection','Aesthetic upgrade','Functional improvement'],objections:['"My phone case is fine"','"These always break"'],angles:['Drop test footage','Aesthetic matching','Multi-functional pitch'],keywords:['phone','case','charger','cable','accessories']},
  'home decor':{triggers:['Space transformation','Guest impression','Mood improvement'],objections:['"Won\'t match my style"','"Looks cheaper in person"'],angles:['Room makeover reveal','Style quiz approach','Satisfaction guarantee'],keywords:['decor','home','wall','room','furniture']},
  'car accessories':{triggers:['Car upgrade on a budget','Road trip convenience','Clean car aesthetic'],objections:['"Will this fit my car?"','"Installation looks hard"'],angles:['Universal fit guarantee','Before/after car tour','Easy install demo'],keywords:['car','vehicle','auto','driving','dashboard']}
};

const AdHeadlines = {
  'Sarah Mitchell':[
    {type:'Problem-Agitate',headline:'Stop wasting $50/month on products that don\'t work',cta:'Shop the fix →'},
    {type:'Social Proof',headline:'12,847 women switched to this — here\'s why',cta:'See what changed →'},
    {type:'FOMO',headline:'This ${product} is selling out fast — don\'t miss it',cta:'Get yours before gone →'},
    {type:'Before/After',headline:'From "this won\'t work" to "where has this been all my life"',cta:'Try it risk-free →'},
    {type:'Question Hook',headline:'Why didn\'t anyone tell me about this sooner?',cta:'Find out why →'},
    {type:'Urgency',headline:'50% OFF ends tonight — this ${product} never goes on sale',cta:'Claim your discount →'},
    {type:'Curiosity',headline:'The ${product} every woman is adding to cart at 2am',cta:'See the buzz →'}
  ],
  'Jason Park':[
    {type:'Specs Lead',headline:'This ${product} just beat [competitor] in every benchmark',cta:'See the data →'},
    {type:'Value Prop',headline:'$30 gadget that outperforms $150 alternatives — verified',cta:'Check specs →'},
    {type:'Community',headline:'Reddit\'s #1 recommendation this month — 2,400+ orders',cta:'Join the consensus →'},
    {type:'Comparison',headline:'I tested 5 ${product}s. This one destroyed the competition',cta:'See results →'},
    {type:'Technical',headline:'Finally, a ${product} that doesn\'t compromise on performance',cta:'View specs →'},
    {type:'Deal',headline:'AliExpress quality at 60% less — direct from manufacturer',cta:'Get the deal →'}
  ],
  'Maria Rodriguez':[
    {type:'Mom Endorsement',headline:'Mom of 3 says: "This saved me 30 minutes every day"',cta:'See why moms love it →'},
    {type:'Durability',headline:'Bought this 8 months ago — still works like day one',cta:'Built to last →'},
    {type:'Family Value',headline:'Under $25 and the whole family uses it — 8,400+ reviews',cta:'Shop family deals →'},
    {type:'Practical',headline:'The ${product} every kitchen needs (and it\'s on sale)',cta:'Get organized →'},
    {type:'Trust',headline:'Amazon\'s #1 bestseller in its category — for a reason',cta:'See why →'},
    {type:'Budget',headline:'Stop buying cheap ${product}s that break in a week',cta:'Upgrade now →'}
  ],
  'Alex Thompson':[
    {type:'Aesthetic',headline:'POV: you found the ${product} that matches your entire vibe',cta:'Shop the aesthetic →'},
    {type:'Sustainability',headline:'Caught me buying sustainable ${product}s that look this good',cta:'Eco-friendly finds →'},
    {type:'Viral',headline:'6,200 people bought this last week — TikTok was right',cta:'Join the trend →'},
    {type:'Exclusivity',headline:'Limited drop: the ${product} your feed has been waiting for',cta:'Don\'t sleep on this →'},
    {type:'FOMO GenZ',headline:'Not me buying this at 2am... okay maybe I am',cta:'No thoughts just vibes →'},
    {type:'Social Proof',headline:'This ${product} went viral for a reason — 10K+ sold',cta:'See what\'s hype →'}
  ]
};

const EmailSequences = {
  'Sarah Mitchell':{
    welcome:[
      {subject:'You\'re in! Here\'s 15% off your first order 🎉',body:'Hey! Welcome to the club. We\'re obsessed with finding products that actually work (no more wasted money). Here\'s your 15% off code: WELCOME15. Happy shopping!'},
      {subject:'The ${product} story (and why 12K+ women love it)',body:'Quick story: we found this ${product} and couldn\'t believe how well it worked. So we asked our community... 12,847 five-star reviews later, here we are. See why they\'re obsessed →'},
      {subject:'"Is this legit?" (honest answer inside)',body:'We get it — you\'ve been burned before. That\'s why we offer free returns, 30-day guarantee, and real customer photos (not stock models). Try it risk-free.'}
    ],
    abandoned:[
      {subject:'You left something behind... 👀',body:'Hey! Your ${product} is still in your cart. We get it — life happens. But this one\'s selling fast and we\'d hate for you to miss out. Complete your order →'},
      {subject:'Still thinking? Here\'s what other women say...',body:'We noticed you didn\'t finish checkout. No pressure — but here are 3 reviews from women just like you who almost didn\'t buy it. "Literally the best purchase I\'ve made this year" →'},
      {subject:'Last chance: your 10% off expires tonight ⏰',body:'Your cart is waiting with 10% OFF applied: SAVE10. This code expires at midnight. Don\'t let this one slip away →'}
    ],
    postPurchase:[
      {subject:'Your order is on its way! 📦',body:'Exciting news — your ${product} shipped! Track it here. Pro tip: check the unboxing guide we included to get the most out of it from day one.'},
      {subject:'How\'s your ${product}? (quick favor)',body:'Hey! It\'s been a week — how are you loving your new ${product}? If it\'s a game changer, we\'d love a quick review. It helps other women like you find it!'},
      {subject:'Your friends need this too 🎁',body:'Know someone who\'d love this ${product}? Share your referral link and you both get $10 off. Win-win!'}
    ]
  },
  'Jason Park':{
    welcome:[
      {subject:'Welcome to the inner circle — 10% off inside',body:'You\'re in. We curate the best tech gadgets before they hit mainstream. Here\'s your 10% welcome code: TECH10. Let\'s upgrade your setup.'},
      {subject:'The ${product} that outperforms [competitor] — benchmarks inside',body:'We ran the numbers. This ${product} beat [competitor] in 7/10 benchmarks. Full comparison chart inside. The data speaks for itself.'},
      {subject:'Why we picked this ${product} (our selection process)',body:'We test 50+ gadgets monthly. Only 2 make the cut. Here\'s why this ${product} passed our 7-point quality check →'}
    ],
    abandoned:[
      {subject:'Your ${product} cart — specs comparison vs alternatives',body:'Still deciding? We built a quick spec comparison: this ${product} vs 3 alternatives at the same price. Spoiler: it wins on battery, build quality, and value.'},
      {subject:'Reddit is talking about your cart item 👀',body:'Found 3 Reddit threads about this ${product}. Consensus: "honestly pretty solid bang for buck." Thought you\'d want to know.'},
      {subject:'Price drop alert: your ${product} is 15% off today only',body:'Flash deal: the ${product} in your cart just dropped 15%. One day only. We don\'t do sales often →'}
    ],
    postPurchase:[
      {subject:'${product} shipped — estimated arrival',body:'Your ${product} is on its way. ETA: 3-5 days. Quick start guide included in the box. We\'d love to see your setup when it arrives.'},
      {subject:'Rate your ${product} (and get 5% off next order)',body:'Honest question: does the ${product} live up to the specs? Leave a review and get 5% off your next order. No bias — we publish all reviews.'},
      {subject:'The accessory combo most buyers add',body:'80% of ${product} owners also grabbed [accessory]. Bundle deal: get both for 20% off. Just saying →'}
    ]
  },
  'Maria Rodriguez':{
    welcome:[
      {subject:'Welcome, mama! Here\'s your family discount 🏠',body:'Hey! Welcome to our community of 8,400+ moms who found products that actually work for the whole family. Your 15% off code: MOM15. You deserve this.'},
      {subject:'Why 8,400+ moms gave this 5 stars',body:'We asked moms what matters most: durability, value, and ease of use. This ${product} checks all three. See the reviews →'},
      {subject:'"I wish I\'d bought this sooner" — real mom reviews',body:'The #1 thing moms say about this ${product}: "I wish I hadn\'t waited." Here\'s why it\'s a household essential →'}
    ],
    abandoned:[
      {subject:'Your ${product} is still here (and so is the discount)',body:'Hey mama! Your ${product} is waiting in your cart. We know budgets are tight — that\'s why we extended your 10% off for 24 more hours.'},
      {subject:'What other moms said about this ${product}...',body:'3 moms who almost didn\'t buy it: "Best kitchen purchase this year" / "My kids actually use it" / "Saved me so much time." Complete your order →'},
      {subject:'Free shipping added to your cart! 🚚',body:'We added free shipping to your ${product} order. No minimum, no catch. Just click complete →'}
    ],
    postPurchase:[
      {subject:'Your ${product} is on its way to your home! 📦',body:'Great news — your ${product} shipped! It\'ll arrive in 3-5 days. We included a quick-start guide perfect for busy moms.'},
      {subject:'How\'s the family loving it? 💛',body:'Hey! It\'s been a week — how\'s the ${product} working out for the family? If the kids love it too, we\'d be so grateful for a quick review!'},
      {subject:'Family bundle deal just for you 🎁',body:'Since you loved the ${product}, here\'s an exclusive: get our family bundle (3 bestsellers) for 30% off. Limited time →'}
    ]
  },
  'Alex Thompson':{
    welcome:[
      {subject:'you\'re in 🌿 here\'s your aesthetic starter pack',body:'welcome to the club. we curate sustainable finds that look incredible AND do good. your 10% code: VIBES10. let\'s make your space iconic.'},
      {subject:'the ${product} that broke the internet (for real)',body:'6,200 people bought this last week. here\'s the TikTok that started it all + why it actually lives up to the hype →'},
      {subject:'our sustainability promise 🌱',body:'we only stock products we\'d actually buy. every ${product} is vetted for quality, sustainability, and aesthetic value. no greenwashing, ever.'}
    ],
    abandoned:[
      {subject:'your cart is giving... abandoned aesthetic 🖤',body:'hey! your ${product} is waiting. we get it — decision fatigue is real. but this one\'s selling fast and the aesthetic is immaculate.'},
      {subject:'the reviews are in... 📱',body:'500+ people bought this ${product} this week. their reviews: "the aesthetic is immaculate" / "sustainable AND cute?? yes please" / "not me ordering a second one"'},
      {subject:'low stock alert 🚨 only 12 left',body:'the ${product} in your cart is almost gone. we restock monthly but this colorway won\'t come back. just saying 🤷'}
    ],
    postPurchase:[
      {subject:'your ${product} shipped sustainably 🌿',body:'your order is on its way! we used compostable packaging because... planet earth. track your order →'},
      {subject:'show us your setup? 📸',body:'hey! we\'d love to see your ${product} in your space. tag us @brand for a chance to be featured. aesthetic content only ✨'},
      {subject:'friend code: give $10 get $10 🤝',body:'share your unique code with friends and you both get $10 off. sustainability looks better with friends →'}
    ]
  }
};

const LandingPageBlueprint = [
  {section:'Hero Banner',priority:'Must Have',details:'Full-width lifestyle photo, headline matching ad copy, CTA button above fold, trust badge (5-star rating)',copy:'Use the winning ad headline here. Match the exact wording so the customer feels continuity from ad → landing page.'},
  {section:'Social Proof Bar',priority:'Must Have',details:'滚动 testimonial bar with 3-5 short quotes, star rating, total review count, "As seen on [platform]" badge',copy:'Place immediately below hero. Numbers convert: "12,847 happy customers" beats "Many satisfied customers."'},
  {section:'Problem-Agitate Section',priority:'Must Have',details:'3-column grid showing common pain points this product solves, with relatable icons and short copy',copy:'Mirror the fears from the persona profile. "Tired of [pain point]?" format works universally.'},
  {section:'Product Demo Video',priority:'High Value',details:'30-60 second product-in-use video, autoplay muted, shows transformation/result, no fancy editing needed',copy:'UGC-style beats professional. Show real person using product, not a studio production. 15-second hook is critical.'},
  {section:'Features & Benefits',priority:'Must Have',details:'Alternating left/right layout: feature icon + benefit headline + 1-line explanation. 4-6 features max.',copy:'Benefits > Features. "Saves 30 minutes daily" beats "Has 5000mAh battery." Lead with what they GET, not what it HAS.'},
  {section:'Before/After Gallery',priority:'High Value',details:'Side-by-side comparison photos, user-submitted preferred, grid of 4-6 transformations, carousel on mobile',copy:'The single highest-converting section for most products. Always use real photos. AI-enhanced OK but never fake.'},
  {section:'Reviews Section',priority:'Must Have',details:'5-star filter default, photo reviews first, "verified buyer" badge, sort by most helpful, show negative reviews too',copy:'Showing a few negative reviews (3-star) actually INCREASES trust. Only show ones you\'ve responded to professionally.'},
  {section:'Comparison Table',priority:'High Value',details:'Your product vs 2-3 competitors/alternatives, checkmark grid, highlight your advantages, honest about tradeoffs',copy:'Don\'t lie. If competitor is cheaper, say so: "Cheaper alternatives exist. This one lasts 3x longer."'},
  {section:'FAQ Section',priority:'Must Have',details:'Accordion-style, address top 5-7 objections from persona profile, include shipping/returns/warranty info',copy:'Use the EXACT objection phrasing from the persona. "Will this actually work for ME?" as a heading converts.'},
  {section:'Bundle / Upsell',priority:'Optional',details:'"Frequently bought together" grid, bundle discount calculator, complementary product suggestions',copy:'Show savings: "Bundle and save $15" is more compelling than "Add accessories." Calculator makes it tangible.'},
  {section:'Urgency Elements',priority:'Must Have',details:'Stock counter ("Only X left"), countdown timer for sales, "X people viewing now", recent purchase notifications',copy:'Use real scarcity. Fake timers destroy trust. If sale ends, it ends. Authenticity > pressure.'},
  {section:'Footer Trust',priority:'Must Have',details:'Payment icons, SSL badge, return policy summary, contact info, social media links, shipping info',copy:'Every element answers one question: "Is this safe to buy?" Reduce friction at the final decision point.'}
];

const PlatformStrategies = {
  'Sarah Mitchell':{
    facebook:{budget:'40% of ad spend',adTypes:['Carousel (before/after)','Video (60s testimonial)','Collection ads','Lead gen forms'],targeting:'Women 28-44, interests: Home Organization + Beauty Tools, Engaged Shoppers, Lookalike from purchasers',creative:'Warm, relatable, "your friend telling you about this" vibe. Show real women, not models. Problem-first hook.',optimal:'Run ads 7-10pm, increase budget Thu-Sun, retarget cart abandoners within 1 hour'},
    instagram:{budget:'30% of ad spend',adTypes:['Reels (15-30s transformation)','Stories (poll + swipe up)','Carousel (lifestyle photos)','Shopping posts'],targeting:'Women 25-40, interest: Lifestyle + Self-care, Instagram Shoppers, Engagement custom audience',creative:'Aesthetic, aspirational but achievable. Natural lighting, real homes. "That could be my bathroom" feel.',optimal:'Post Reels 6-9pm, Stories daily, use 5-7 hashtags, engage with comments within 30min'},
    tiktok:{budget:'25% of ad spend',adTypes:['In-Feed (15s problem→solution)','Spark Ads (boost creator content)','TopView (launch days)','Shopping ads'],targeting:'Women 22-38, interest: Life Hacks + Product Reviews, Engaged with similar products',creative:'UGC-style, show the PROBLEM first (3s), then the product as hero. Trending audio. Hook in first 1 second.',optimal:'Post 2-3x/day, best times 7-10pm, respond to comments with video, duet positive reviews'},
    youtube:{budget:'5% of ad spend',adTypes:['Pre-roll skippable (15s hook)','Shorts (repurpose TikTok)','Long-form review placement'],targeting:'In-market: Home + Kitchen, custom intent: product-related searches',creative:'Review-style, "I tested this for 30 days" format. Longer format for high-ticket items only.',optimal:'Target competitor product names as keywords, run Shorts repurposed from TikTok'}
  },
  'Jason Park':{
    facebook:{budget:'15% of ad spend',adTypes:['Video review style','Single image (product on desk)','Collection (product ecosystem)'],targeting:'Men 22-35, interests: Tech Gadgets + Gaming Setup, Tech Early Adopters, High online spend',creative:'Tech-focused, specs-forward. Show the product in a real desk setup. Benchmark comparison overlay.',optimal:'Run evenings 7-10pm, retarget YouTube viewers, test against Reddit audience'},
    instagram:{budget:'20% of ad spend',adTypes:['Reels (unboxing/setup)','Carousel (spec comparison)','Stories (quick demo)','Shopping posts'],targeting:'Men 20-32, interests: Tech + Gaming + EDC, Instagram Shopping engaged',creative:'Clean, minimal aesthetic. Product on dark desk background. Specs as text overlay. "Overengineered" feel.',optimal:'Reels 3x/week, carousel for detailed specs, engage in tech comments'},
    tiktok:{budget:'35% of ad spend',adTypes:['In-Feed (honest review)','Duet/Stitch (react to other reviews)','Spark Ads'],targeting:'Men 18-30, interests: Tech Reviews + Gadget Unboxing, High engagement',creative:'"Honest review" format, show pros AND cons. Reddit energy. "No cap this slaps" authenticity.',optimal:'Post 1-2x/day, reply to comments with video, stitch competitor reviews'},
    youtube:{budget:'30% of ad spend',adTypes:['Pre-roll (spec-focused)','Sponsored reviews','Shorts (quick comparisons)'],targeting:'Tech channels audience, custom intent: product searches, competitor product names',creative:'Detailed, specs-heavy. "I compared 5 ${product}s — here\'s the winner" format. Benchmark data on screen.',optimal:'Sponsor 2-3 micro-tech channels, run pre-roll on review videos, Shorts for quick takes'}
  },
  'Maria Rodriguez':{
    facebook:{budget:'50% of ad spend',adTypes:['Carousel (family use cases)','Video (mom testimonial)','Group posts','Collection ads'],targeting:'Women 30-50, Parents with Young Children, interests: Mom Life + Budget Shopping, Engaged Shoppers',creative:'Warm, trustworthy, "I\'m a mom too" feel. Show product in real family setting. Durability emphasis.',optimal:'Run during nap time 1-3pm and bedtime 9-11pm, post in mom groups, retarget within 2 hours'},
    instagram:{budget:'15% of ad spend',adTypes:['Reels (mom routine)','Stories (behind the scenes)','Carousel (family photos)'],targeting:'Women 28-45, interests: Parenting + Home Organization, Instagram Shopping',creative:'Real family life, not staged. Show kids using it. "This is what 3pm chaos looks like before this product" before/after.',optimal:'Stories daily (polls engage moms), Reels 3x/week, respond to DMs within 1 hour'},
    tiktok:{budget:'20% of ad spend',adTypes:['In-Feed (mom hack)','MomTok content','Spark Ads (mom creator)'],targeting:'Women 25-45, interests: MomTok + Parenting Tips + Family Hacks',creative:'"Mom hack" format, show the problem (messy kitchen) then the solution. Relatable, not aspirational.',optimal:'Post during nap time, engage #MomTok, duet mom creators'},
    youtube:{budget:'15% of ad spend',adTypes:['Mom blogger reviews','Pre-roll on parenting channels','Shorts (quick tips)'],targeting:'Parenting channels, family vlogs, home organization content',creative:'"Honest mom review" format. Show the product lasting through real family use. Long-term update preferred.',optimal:'Sponsor family/parenting channels, target back-to-school and holiday seasons harder'}
  },
  'Alex Thompson':{
    facebook:{budget:'10% of ad spend',adTypes:['Reels (aesthetic reveal)','Carousel (lifestyle photos)','Collection (aesthetic bundle)'],targeting:'Age 18-28, interests: Aesthetic Lifestyle + Sustainable Living, Mobile Buyers, Social Media Active',creative:'Aesthetic-first. Clean, minimal, Instagram-ready. Sustainability angle prominent. Color-coordinated.',optimal:'Low budget, mostly retargeting. Use for lookalike audiences from TikTok purchasers.'},
    instagram:{budget:'25% of ad spend',adTypes:['Reels (GRWM/aesthetic)','Stories (limited drops)','Carousel (flat lay)','Shopping posts'],targeting:'Age 18-28, interests: Aesthetic + Sustainable + Art & Design, Instagram Shopping',creative:'Curated aesthetic. Every post should look like it belongs in a mood board. Sustainability stories highlighted.',optimal:'Post 1-2x/day, Stories 3-5x/day, use aesthetic hashtags, engage with comment section'},
    tiktok:{budget:'55% of ad spend',adTypes:['In-Feed (viral format)','Spark Ads (boost creators)','TopView (limited drops)','LIVE (unboxing)'],targeting:'Age 16-24, interests: Aesthetic + Sustainable Finds + Haul + GRWM, High engagement, Share creators',creative:'Native TikTok energy. Show product in aesthetic space. "POV" format. Trending sounds. Authentic, not polished.',optimal:'Post 2-4x/day, ride trends within 24 hours, reply to comments with video, go LIVE for drops'},
    youtube:{budget:'10% of ad spend',adTypes:['Shorts (aesthetic reveals)','Creator collaborations','Aesthetic vlogs'],targeting:'Lifestyle channels, room decor, sustainable living content',creative:'"Day in my life with [product]" format. Soft, aesthetic, ASMR-adjacent. Product feels like part of the lifestyle.',optimal:'Collab with aesthetic YouTubers, repurpose TikTok as Shorts, target haul/GRWM content'}
  }
};

function findProduct(query, products) {
  const q = query.toLowerCase();
  const match = products.find(p =>
    p.title.toLowerCase().includes(q) ||
    p.keywords.some(k => k.toLowerCase().includes(q))
  ) || [...products].sort((a,b) => b.score - a.score)[0];
  const productKey = Object.keys(ProductPersonas).find(k =>
    q.includes(k) || ProductPersonas[k].keywords?.some(kw => q.includes(kw))
  ) || match?.keywords?.[0] || '';
  const extraData = ProductPersonas[productKey] || ProductPersonas['wireless earbuds'];
  return { ...match, extraData };
}

function renderPersonaCard(persona, product, index) {
  const pName = product.title?.split('—')[0]?.trim() || 'product';
  return `<div class="cps-persona-card">
    <div class="cps-persona-header">
      <div class="cps-persona-avatar" style="background:${persona.color}22;color:${persona.color}">${persona.avatar}</div>
      <div>
        <div class="cps-persona-name">${esc(persona.name)}</div>
        <div class="cps-persona-tagline">${esc(persona.age)} · ${esc(persona.gender)} · ${esc(persona.location)}</div>
      </div>
    </div>

    <div class="cps-persona-profile">
      <div class="cps-profile-item"><div class="cps-profile-label">Income</div><div class="cps-profile-value">${esc(persona.income)}</div></div>
      <div class="cps-profile-item"><div class="cps-profile-label">Location</div><div class="cps-profile-value">${esc(persona.location)}</div></div>
      <div class="cps-profile-item" style="grid-column:1/-1"><div class="cps-profile-label">Lifestyle</div><div class="cps-profile-value" style="font-size:11px;text-align:left;line-height:1.5">${esc(persona.lifestyle)}</div></div>
    </div>

    <div class="cps-section">
      <div class="cps-section-title">🗣️ How They Talk — Language & Voice</div>
      <div class="cps-lang-chips">${persona.language.map(l => `<span class="cps-lang-chip">"${esc(l)}"</span>`).join('')}</div>
      <div class="cps-section-note">Use these exact phrases in your ad copy to feel native to their feed.</div>
    </div>

    <div class="cps-section">
      <div class="cps-section-title">✅ Why They Buy — Emotional Triggers</div>
      <div class="cps-trigger-list">
        ${persona.buyingTriggers.map(t => `<div class="cps-trigger-item"><span class="cps-trigger-icon">✅</span><span class="cps-trigger-text">${esc(t)}</span></div>`).join('')}
        ${(product.extraData?.triggers || []).map(t => `<div class="cps-trigger-item"><span class="cps-trigger-icon">🎯</span><span class="cps-trigger-text"><strong>${esc(t)}</strong> — Product-specific</span></div>`).join('')}
      </div>
    </div>

    <div class="cps-section">
      <div class="cps-section-title">🚧 Objections & How to Overcome</div>
      <div class="cps-trigger-list">
        ${persona.objections.map((o,i) => `<div class="cps-trigger-item objection"><span class="cps-trigger-icon">❌</span><span class="cps-trigger-text">${esc(o)}<br><em style="color:var(--accent-green)">→ Fix: ${esc(persona.persuasionAngles[i] || 'Address with social proof')}</em></span></div>`).join('')}
      </div>
    </div>

    <div class="cps-section">
      <div class="cps-section-title">💰 Price Sensitivity</div>
      <div class="cps-price-grid">
        <div class="cps-price-item cps-price-low"><div class="cps-price-label">Impulse Zone</div><div class="cps-price-val">${persona.priceRange.low}</div></div>
        <div class="cps-price-item cps-price-mid"><div class="cps-price-label">Research Zone</div><div class="cps-price-val">${persona.priceRange.$mid}</div></div>
        <div class="cps-price-item cps-price-high"><div class="cps-price-label">Considered Purchase</div><div class="cps-price-val">${persona.priceRange.$high}</div></div>
      </div>
    </div>

    <div class="cps-section">
      <div class="cps-section-title">📱 Content They Engage With</div>
      <div class="cps-content-list">${persona.contentFormats.map(c => `<div class="cps-content-item"><span class="cps-content-icon">▶</span>${c}</div>`).join('')}</div>
    </div>

    <div class="cps-section">
      <div class="cps-section-title">🏆 Social Proof That Works</div>
      <div class="cps-content-list">${persona.socialProof.map(s => `<div class="cps-content-item"><span class="cps-content-icon cps-content-green">★</span>${s}</div>`).join('')}</div>
    </div>

    <div class="cps-audience-section">
      <div class="cps-section-title">🎯 Ad Targeting Settings</div>
      <div class="cps-audience-grid">
        <div class="cps-audience-card">
          <div class="cps-audience-card-title">📘 Facebook / Instagram</div>
          <div class="cps-audience-tags">
            <span class="cps-audience-tag">Age: ${persona.fbTargeting.age}</span>
            <span class="cps-audience-tag">Interests: ${persona.fbTargeting.interests.slice(0,3).join(', ')}</span>
            <span class="cps-audience-tag">Behaviors: ${persona.fbTargeting.behaviors.join(', ')}</span>
            <span class="cps-audience-tag">Countries: ${persona.fbTargeting.countries.join(', ')}</span>
          </div>
        </div>
        <div class="cps-audience-card">
          <div class="cps-audience-card-title">🎵 TikTok</div>
          <div class="cps-audience-tags">
            <span class="cps-audience-tag">Age: ${persona.tiktokTargeting.age}</span>
            <span class="cps-audience-tag">Interests: ${persona.tiktokTargeting.interests.slice(0,3).join(', ')}</span>
            <span class="cps-audience-tag">Behaviors: ${persona.tiktokTargeting.behaviors.join(', ')}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="cps-adcopy-section">
      <div class="cps-adcopy-title">✍️ Sample Ad Copy</div>
      <div class="cps-adcopy-text">"${esc(persona.adCopy.replace(/\$\{product\}/g, pName))}"</div>
    </div>
  </div>`;
}

const CustomerPersonaPlugin = {
  id:'customer-persona',
  name:'Customer Profiles',
  version:'1.2.0',
  description:'AI-generated psychographic buyer profiles with targeting, language, pricing, and journey insights',
  dependencies:['search-engine'],
  _section:null,

  init(ctx){Config.defaults('customerPersona',{enabled:true});},

  mount(ctx){
    const container = UI.$('sections-container');
    if (!container) return;

    const section = document.createElement('section');
    section.className = 'section section-personas';
    section.id = 'section-personas';
    section.innerHTML = `
      <div class="section-inner">
        <div class="cps-hero">
          <div class="cps-hero-badge">Persona Intelligence</div>
          <h1 class="cps-hero-title">Who Will Buy This?</h1>
          <p class="cps-hero-desc">Generate deep psychographic profiles: exactly how they talk, what triggers their purchase, what stops them, and the perfect ad settings to reach them.</p>
        </div>
        <div class="cps-controls">
          <div class="cps-search-wrap">
            <svg class="cps-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" class="cps-input" id="cpsInput" placeholder="Type a product name (e.g. 'wireless earbuds', 'pet gadgets')">
            <button class="cps-generate-btn" id="cpsGenerateBtn">Generate Personas</button>
          </div>
          <div class="cps-quick-picks">
            <span class="cps-quick-label">Quick try:</span>
            <button class="cps-quick-btn" data-q="wireless earbuds">Earbuds</button>
            <button class="cps-quick-btn" data-q="pet gadgets">Pet Gadgets</button>
            <button class="cps-quick-btn" data-q="kitchen organizer">Kitchen</button>
            <button class="cps-quick-btn" data-q="posture corrector">Posture</button>
            <button class="cps-quick-btn" data-q="galaxy projector">Galaxy Light</button>
            <button class="cps-quick-btn" data-q="beauty tool">Beauty</button>
            <button class="cps-quick-btn" data-q="fitness gadget">Fitness</button>
          </div>
        </div>
        <div class="cps-results" id="cpsResults"></div>
      </div>
      ${window.HuntDrop.renderRelatedTools([
        {section:'section-ad-studio',name:'Ad Studio',desc:'Create targeted ads',icon:'🎨',color:'#ff8a00'},
        {section:'section-objections',name:'Objection Handler',desc:'Handle objections',icon:'🛡️',color:'#00ff88'},
        {section:'section-calendar',name:'Content Calendar',desc:'Plan content',icon:'📅',color:'#00e5ff'},
        {section:'section-battlefield',name:'Competitor Battlefield',desc:"Analyze competitors' audiences",icon:'⚔️',color:'#ff3366'}
      ])}`;
    container.appendChild(section);
    const self = CustomerPersonaPlugin;
    self._section = section;
    const btn = section.querySelector('#cpsGenerateBtn');
    const input = section.querySelector('#cpsInput');
    if(btn) btn.addEventListener('click',()=>self.generate(input?.value||''));
    if(input) input.addEventListener('keypress',e=>{if(e.key==='Enter')self.generate(input.value);});
    section.querySelectorAll('.cps-quick-btn').forEach(b=>{
      b.addEventListener('click',()=>{input.value=b.dataset.q;self.generate(b.dataset.q);});
    });
  },

  unmount(ctx){
    if(CustomerPersonaPlugin._section){CustomerPersonaPlugin._section.remove();CustomerPersonaPlugin._section=null;}
    this._section=null;
  },

  generate(query){
    if(!query.trim()) return;
    const products = window.HuntDrop.ALL_PRODUCTS || [];
    const product = findProduct(query, products);
    const el = this._section?.querySelector('#cpsResults');
    if(!el) return;

    const shuffled = [...PersonaTemplates].sort(()=>Math.random()-0.5);
    const personas = shuffled.slice(0,3);

    el.innerHTML = `
      <div class="cps-output">
        <div class="cps-product-header">
          <div class="cps-product-img"><img src="${product.image}" alt=""></div>
          <div class="cps-product-info">
            <h3 class="cps-product-title">${esc(product.title)}</h3>
            <div class="cps-product-meta">
              <span class="cps-badge cps-badge-score">Score ${product.score}</span>
              <span class="cps-badge cps-badge-margin">${product.margin}% margin</span>
              <span class="cps-badge cps-badge-comp">${product.competition} competition</span>
            </div>
          </div>
        </div>

        <div class="cps-tabs">
          <button class="cps-tab active" data-tab="personas">All Personas</button>
          <button class="cps-tab" data-tab="journey">Customer Journey</button>
          <button class="cps-tab" data-tab="language">Language Deep Dive</button>
          <button class="cps-tab" data-tab="checkout">Checkout Behavior</button>
          <button class="cps-tab" data-tab="competitors">Competitor Mindset</button>
          <button class="cps-tab" data-tab="demographics">Demographics</button>
          <button class="cps-tab" data-tab="adcreatives">Ad Creatives</button>
          <button class="cps-tab" data-tab="emails">Email Templates</button>
          <button class="cps-tab" data-tab="landing">Landing Page</button>
          <button class="cps-tab" data-tab="platforms">Platform Strategy</button>
        </div>

        <div id="cpsTabContent">
          <div class="cps-personas-grid">${personas.map((p,i)=>renderPersonaCard(p,product,i)).join('')}</div>
        </div>
      </div>`;

    const self = this;
    el.querySelectorAll('.cps-tab').forEach(tab=>{
      tab.addEventListener('click',()=>{
        el.querySelectorAll('.cps-tab').forEach(t=>t.classList.remove('active'));
        tab.classList.add('active');
        const content = self._section.querySelector('#cpsTabContent');
        if(!content) return;
        switch(tab.dataset.tab){
          case 'personas':
            content.innerHTML=`<div class="cps-personas-grid">${personas.map((p,i)=>renderPersonaCard(p,product,i)).join('')}</div>`;
            break;
          case 'journey':
            content.innerHTML=self.renderJourney(personas,product);
            break;
          case 'language':
            content.innerHTML=self.renderLanguage(personas,product);
            break;
          case 'checkout':
            content.innerHTML=self.renderCheckout(personas,product);
            break;
          case 'competitors':
            content.innerHTML=self.renderCompetitors(personas,product);
            break;
          case 'demographics':
            content.innerHTML=self.renderDemographics(personas,product);
            break;
          case 'adcreatives':
            content.innerHTML=self.renderAdCreatives(personas,product);
            break;
          case 'emails':
            content.innerHTML=self.renderEmails(personas,product);
            break;
          case 'landing':
            content.innerHTML=self.renderLanding(product);
            break;
          case 'platforms':
            content.innerHTML=self.renderPlatforms(personas,product);
            break;
        }
      });
    });

    el.querySelectorAll('.cps-plat-tab').forEach(tab=>{
      tab.addEventListener('click',()=>{
        el.querySelectorAll('.cps-plat-tab').forEach(t=>t.classList.remove('active'));
        tab.classList.add('active');
        const pContent = self._section.querySelector('#cpsPlatContent');
        if(!pContent) return;
        const platform = tab.dataset.platform;
        const strat = PlatformStrategies[personas[0].name] || PlatformStrategies['Sarah Mitchell'];
        const data = strat[platform];
        if(!data) return;
        const platName = platform.charAt(0).toUpperCase()+platform.slice(1);
        pContent.innerHTML=`
          <div class="cps-plat-card">
            <div class="cps-plat-card-header">
              <h4>${platName} Strategy</h4>
              <span class="cps-plat-budget">${data.budget}</span>
            </div>
            <div class="cps-plat-card-grid">
              <div class="cps-plat-detail"><h5>Ad Types</h5><ul>${data.adTypes.map(a=>`<li>${a}</li>`).join('')}</ul></div>
              <div class="cps-plat-detail"><h5>Targeting</h5><p>${data.targeting}</p></div>
              <div class="cps-plat-detail"><h5>Creative Direction</h5><p>${data.creative}</p></div>
              <div class="cps-plat-detail"><h5>Optimal Timing</h5><p>${data.optimal}</p></div>
            </div>
          </div>`;
      });
    });
  },

  renderJourney(personas, product){
    const pName = product.title?.split('—')[0]?.trim() || 'product';
    const stages = [
      {icon:'👀',title:'Awareness',desc:'They scroll TikTok/Instagram and see a creator using this product',color:'var(--accent-purple)',actions:['See a creator mention it in a GRWM video','Friend shares a link in group chat','Ad appears in Stories/Reels feed','Browse Reddit and see a recommendation']},
      {icon:'🔍',title:'Research',desc:'They Google it, check reviews, compare alternatives',color:'var(--accent-cyan)',actions:['Google "[product] review" and read 3+ sources','Watch YouTube unboxing/comparison','Read Amazon reviews (focus on 3-star for balance)','Check Reddit for honest opinions','Compare prices across 2-3 platforms']},
      {icon:'🤔',title:'Consideration',desc:'They weigh the cost vs. benefit, battle objections internally',color:'var(--accent-orange)',actions:['Ask themselves "Do I really need this?"','Compare to known brands (AirPods, Dyson, etc.)','Calculate cost-per-use in their head','Check if there\'s a return policy','Look for coupon codes or wait for sale']},
      {icon:'💳',title:'Purchase',desc:'Something tips them over — a discount, social proof, or urgency',color:'var(--accent-green)',actions:['See "only 3 left" or countdown timer','Read one more glowing review that seals it','Find a 10% off coupon code','Free shipping threshold pushes them','Apple Pay makes checkout instant']},
      {icon:'📦',title:'Post-Purchase',desc:'Unboxing, using, and deciding if they\'ll buy again or recommend',color:'var(--accent-pink)',actions:['Take photos/videos for social media','Decide within 30 seconds if quality matches expectations','Leave a review (if exceptional or terrible)','Tell friends or post about it','Return if it doesn\'t match the ad promise']}
    ];

    return `
      <div class="cps-journey-hero">
        <h3 class="cps-journey-title">🗺️ Customer Journey Map</h3>
        <p class="cps-journey-sub">The exact path from "What's that?" to "Take my money" — and what to put at each stage.</p>
      </div>
      <div class="cps-journey-stages">
        ${stages.map((s,i)=>`
          <div class="cps-journey-card">
            <div class="cps-journey-num" style="background:${s.color}">${i+1}</div>
            <div class="cps-journey-icon">${s.icon}</div>
            <div class="cps-journey-card-title">${s.title}</div>
            <div class="cps-journey-card-desc">${s.desc}</div>
            <div class="cps-journey-actions">
              ${s.actions.map(a=>`<div class="cps-journey-action"><span class="cps-journey-dot" style="background:${s.color}"></span>${a}</div>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
      <div class="cps-journey-tips">
        <h4>💡 Where Most Dropshippers Lose Them</h4>
        <div class="cps-journey-tips-grid">
          <div class="cps-journey-tip"><div class="cps-journey-tip-stage">Research → Consideration</div><div class="cps-journey-tip-text">Weak product page. No reviews visible, no comparison to competitors, generic stock photos. Fix: Add real customer photos, comparison tables, and trust badges.</div></div>
          <div class="cps-journey-tip"><div class="cps-journey-tip-stage">Consideration → Purchase</div><div class="cps-journey-tip-text">High shipping cost revealed at checkout. Fix: Offer free shipping threshold or bake shipping into price.</div></div>
          <div class="cps-journey-tip"><div class="cps-journey-tip-stage">Purchase → Post-Purchase</div><div class="cps-journey-tip-text">Product doesn\'t match the ad promise. Fix: Use honest product photos, set accurate expectations in ad copy.</div></div>
        </div>
      </div>`;
  },

  renderLanguage(personas, product){
    const allLang = [...new Set(personas.flatMap(p=>p.language))];
    const allTriggers = [...new Set([...personas.flatMap(p=>p.buyingTriggers),...(product.extraData?.triggers||[])])].slice(0,10);
    const allObjections = [...new Set([...personas.flatMap(p=>p.objections),...(product.extraData?.objections||[])])].slice(0,8);
    const allAngles = [...new Set(personas.flatMap(p=>p.persuasionAngles))].slice(0,8);

    return `
      <div class="cps-lang-hero">
        <h3 class="cps-lang-title">🗣️ Language Deep Dive</h3>
        <p class="cps-lang-sub">The exact words, phrases, and tone that make this audience stop scrolling and start buying.</p>
      </div>

      <div class="cps-lang-section">
        <h4 class="cps-section-title">💬 Words That Resonate</h4>
        <p class="cps-section-note">Use these exact phrases in ad copy to feel native to their feed.</p>
        <div class="cps-lang-chips cps-lang-chips-large">${allLang.map(l=>`<span class="cps-lang-chip cps-lang-chip-lg">"${esc(l)}"</span>`).join('')}</div>
      </div>

      <div class="cps-lang-section">
        <h4 class="cps-section-title">✅ Emotional Triggers to Use in Copy</h4>
        <div class="cps-lang-list">${allTriggers.map((t,i)=>`<div class="cps-lang-item"><span class="cps-lang-num">${i+1}</span><div class="cps-lang-text"><strong>${esc(t)}</strong><div class="cps-lang-example">→ Use in headline: "Finally, a ${esc(t.toLowerCase().split(' ').slice(0,3).join(' '))}..."</div></div></div>`).join('')}</div>
      </div>

      <div class="cps-lang-section">
        <h4 class="cps-section-title">🚧 Objections to Address in Ad Copy</h4>
        <div class="cps-lang-list">${allObjections.map((o,i)=>`<div class="cps-lang-item"><span class="cps-lang-num cps-lang-num-red">${i+1}</span><div class="cps-lang-text">${esc(o)}<div class="cps-lang-example">→ Counter with: "Unlike ${esc(o.replace(/"/g,'').replace('this is just another dropshipping scam','cheap alternatives').replace(/"/g,'').substring(0,30))}... this actually delivers."</div></div></div>`).join('')}</div>
      </div>

      <div class="cps-lang-section">
        <h4 class="cps-section-title">🎯 Best Persuasion Angles</h4>
        <div class="cps-lang-list">${allAngles.map((a,i)=>`<div class="cps-lang-item"><span class="cps-lang-num cps-lang-num-green">${i+1}</span><div class="cps-lang-text">${esc(a)}</div></div>`).join('')}</div>
      </div>`;
  },

  renderCheckout(personas, product){
    const allAbandons = [...new Set(personas.flatMap(p=>p.checkoutBehavior.abandons))];
    const allCompletes = [...new Set(personas.flatMap(p=>p.checkoutBehavior.completes))];
    const allWindows = personas.map(p=>({best:p.purchaseWindow.best,worst:p.purchaseWindow.worst,seasonal:p.purchaseWindow.seasonal}));

    return `
      <div class="cps-checkout-hero">
        <h3 class="cps-checkout-title">💳 Checkout Behavior</h3>
        <p class="cps-checkout-sub">When they buy, what makes them abandon, and exactly how to optimize your checkout.</p>
      </div>

      <div class="cps-checkout-section">
        <h4 class="cps-section-title">⏰ Best Times to Run Ads</h4>
        <div class="cps-checkout-windows">
          ${allWindows.map((w,i)=>`
            <div class="cps-checkout-window-card">
              <div class="cps-window-persona">${personas[i].name}</div>
              <div class="cps-window-row cps-window-best"><span class="cps-window-label">🟢 Best</span><span>${w.best}</span></div>
              <div class="cps-window-row cps-window-worst"><span class="cps-window-label">🔴 Worst</span><span>${w.worst}</span></div>
              <div class="cps-window-row cps-window-seasonal"><span class="cps-window-label">📅 Seasonal</span><span>${w.seasonal}</span></div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="cps-checkout-section">
        <h4 class="cps-section-title">🛑 What Makes Them Abandon</h4>
        <div class="cps-checkout-grid">
          ${allAbandons.map(a=>`<div class="cps-checkout-item cps-checkout-bad"><span class="cps-checkout-icon">✗</span>${esc(a)}</div>`).join('')}
        </div>
      </div>

      <div class="cps-checkout-section">
        <h4 class="cps-section-title">✅ What Makes Them Complete</h4>
        <div class="cps-checkout-grid">
          ${allCompletes.map(c=>`<div class="cps-checkout-item cps-checkout-good"><span class="cps-checkout-icon">✓</span>${esc(c)}</div>`).join('')}
        </div>
      </div>

      <div class="cps-checkout-section">
        <h4 class="cps-section-title">🔧 Your Checkout Checklist</h4>
        <div class="cps-checklist">
          <div class="cps-checklist-item"><input type="checkbox" id="chk1"><label for="chk1">Free shipping (or threshold visible)</label></div>
          <div class="cps-checklist-item"><input type="checkbox" id="chk2"><label for="chk2">Apple Pay / Google Pay enabled</label></div>
          <div class="cps-checklist-item"><input type="checkbox" id="chk3"><label for="chk3">Reviews visible on product page</label></div>
          <div class="cps-checklist-item"><input type="checkbox" id="chk4"><label for="chk4">Return policy clearly stated</label></div>
          <div class="cps-checklist-item"><input type="checkbox" id="chk5"><label for="chk5">Trust badges / SSL seal displayed</label></div>
          <div class="cps-checklist-item"><input type="checkbox" id="chk6"><label for="chk6">Order tracking confirmation</label></div>
          <div class="cps-checklist-item"><input type="checkbox" id="chk7"><label for="chk7">Urgency element (stock count / timer)</label></div>
          <div class="cps-checklist-item"><input type="checkbox" id="chk8"><label for="chk8">Mobile checkout tested</label></div>
        </div>
      </div>`;
  },

  renderCompetitors(personas, product){
    const allCompete = [...new Set(personas.flatMap(p=>p.competitorMindset))];

    return `
      <div class="cps-comp-hero">
        <h3 class="cps-comp-title">🧠 Competitor Mindset</h3>
        <p class="cps-comp-sub">How your customers evaluate alternatives — and how to position your product as the clear winner.</p>
      </div>

      <div class="cps-comp-section">
        <h4 class="cps-section-title">🔎 How They Compare Products</h4>
        <div class="cps-comp-list">${allCompete.map((c,i)=>`<div class="cps-comp-item"><span class="cps-comp-num">${i+1}</span><div class="cps-comp-text">${c}</div></div>`).join('')}</div>
      </div>

      <div class="cps-comp-section">
        <h4 class="cps-section-title">📋 Positioning Strategy</h4>
        <div class="cps-comp-grid">
          <div class="cps-comp-card">
            <div class="cps-comp-card-title">vs. Known Brands</div>
            <div class="cps-comp-card-text">"Same quality, half the price. 12,000+ happy customers can't be wrong."</div>
          </div>
          <div class="cps-comp-card">
            <div class="cps-comp-card-title">vs. Cheaper Alternatives</div>
            <div class="cps-comp-card-text">"You get what you pay for. This lasts 3x longer than the $5 versions."</div>
          </div>
          <div class="cps-comp-card">
            <div class="cps-comp-card-title">vs. "Just Wait for Sale"</div>
            <div class="cps-comp-card-text">"This is already 60% off retail. The price won't get better."</div>
          </div>
          <div class="cps-comp-card">
            <div class="cps-comp-card-title">vs. Not Buying At All</div>
            <div class="cps-comp-card-text">"You'll spend more time/money solving this problem without it."</div>
          </div>
        </div>
      </div>`;
  },

  renderDemographics(personas, product){
    const allPersonaNames = ['Sarah Mitchell','Jason Park','Maria Rodriguez','Alex Thompson'];
    const colors = ['#E74C3C','#3498DB','#F39C12','#2ECC71'];
    const demoData = [
      {age:'28-44',gender:'92% Female',income:'$55K-$95K',location:'Suburban USA',platforms:'FB/IG/Pinterest',devices:'68% Mobile',peak:'Sun 8-10pm',avgOrder:'$22',ltv:'$78',repeat:'34%'},
      {age:'22-35',gender:'78% Male',income:'$45K-$80K',location:'Urban Metro',platforms:'Reddit/YouTube/TikTok',devices:'72% Mobile',peak:'Weekdays 7-10pm',avgOrder:'$28',ltv:'$92',repeat:'28%'},
      {age:'30-50',gender:'88% Female',income:'$40K-$75K',location:'Suburban/Rural',platforms:'FB/YouTube/Pinterest',devices:'65% Mobile',peak:'Nap time 1-3pm',avgOrder:'$25',ltv:'$85',repeat:'41%'},
      {age:'18-28',gender:'60% Female',income:'$25K-$55K',location:'Urban/College',platforms:'TikTok/IG/YouTube',devices:'85% Mobile',peak:'9pm-12am',avgOrder:'$19',ltv:'$62',repeat:'22%'}
    ];

    return `
      <div class="cps-demos-hero">
        <h3 class="cps-demos-title">📊 Audience Demographics Breakdown</h3>
        <p class="cps-demos-sub">Hard data on who buys, when they buy, and how much they spend.</p>
      </div>

      <div class="cps-demos-persona-cards">
        ${personas.map((p,i)=>`
          <div class="cps-demo-pcard" style="border-left:4px solid ${colors[i]}">
            <div class="cps-demo-pcard-header">
              <span class="cps-demo-pcard-icon">${p.icon}</span>
              <span class="cps-demo-pcard-name">${p.name}</span>
            </div>
            <div class="cps-demo-pcard-grid">
              <div class="cps-demo-stat"><span class="cps-demo-stat-label">Age Range</span><span class="cps-demo-stat-value">${demoData[i].age}</span></div>
              <div class="cps-demo-stat"><span class="cps-demo-stat-label">Gender</span><span class="cps-demo-stat-value">${demoData[i].gender}</span></div>
              <div class="cps-demo-stat"><span class="cps-demo-stat-label">Income</span><span class="cps-demo-stat-value">${demoData[i].income}</span></div>
              <div class="cps-demo-stat"><span class="cps-demo-stat-label">Location</span><span class="cps-demo-stat-value">${demoData[i].location}</span></div>
              <div class="cps-demo-stat"><span class="cps-demo-stat-label">Platforms</span><span class="cps-demo-stat-value">${demoData[i].platforms}</span></div>
              <div class="cps-demo-stat"><span class="cps-demo-stat-label">Devices</span><span class="cps-demo-stat-value">${demoData[i].devices}</span></div>
              <div class="cps-demo-stat"><span class="cps-demo-stat-label">Peak Hours</span><span class="cps-demo-stat-value">${demoData[i].peak}</span></div>
              <div class="cps-demo-stat"><span class="cps-demo-stat-label">Avg Order</span><span class="cps-demo-stat-value">${demoData[i].avgOrder}</span></div>
              <div class="cps-demo-stat"><span class="cps-demo-stat-label">Lifetime Value</span><span class="cps-demo-stat-value">${demoData[i].ltv}</span></div>
              <div class="cps-demo-stat"><span class="cps-demo-stat-label">Repeat Rate</span><span class="cps-demo-stat-value">${demoData[i].repeat}</span></div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="cps-demos-comparison">
        <h4 class="cps-demos-section-title">📈 Persona Comparison Matrix</h4>
        <div class="cps-demos-table-wrap">
          <table class="cps-demos-table">
            <thead>
              <tr>
                <th>Metric</th>
                ${personas.map((p,i)=>`<th style="color:${colors[allPersonaNames.indexOf(p.name)]}">${p.icon} ${p.name.split(' ')[0]}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              <tr><td>Avg Order Value</td>${personas.map((_,i)=>`<td>${demoData[i].avgOrder}</td>`).join('')}</tr>
              <tr><td>Lifetime Value</td>${personas.map((_,i)=>`<td>${demoData[i].ltv}</td>`).join('')}</tr>
              <tr><td>Repeat Purchase</td>${personas.map((_,i)=>`<td>${demoData[i].repeat}</td>`).join('')}</tr>
              <tr><td>Mobile vs Desktop</td>${personas.map((_,i)=>`<td>${demoData[i].devices}</td>`).join('')}</tr>
              <tr><td>Peak Buying</td>${personas.map((_,i)=>`<td>${demoData[i].peak}</td>`).join('')}</tr>
              <tr><td>Price Sensitivity</td><td>Medium</td><td>Low</td><td>High</td><td>Medium-High</td></tr>
              <tr><td>Impulse Buy Rate</td><td>35%</td><td>22%</td><td>18%</td><td>52%</td></tr>
              <tr><td>Research Time</td><td>2-3 days</td><td>5-7 days</td><td>3-5 days</td><td>Same day</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="cps-demos-key-insights">
        <h4 class="cps-demos-section-title">🎯 Key Demographic Insights</h4>
        <div class="cps-demos-insight-cards">
          <div class="cps-demos-insight"><span class="cps-demos-insight-icon">📱</span><div><strong>Mobile-First:</strong> All personas are 65%+ mobile. Every page must be mobile-optimized or you lose half the sale.</div></div>
          <div class="cps-demos-insight"><span class="cps-demos-insight-icon">🌙</span><div><strong>Evening Dominance:</strong> 70%+ purchases happen 7pm-11pm. Run ads starting 6pm, not 9am.</div></div>
          <div class="cps-demos-insight"><span class="cps-demos-insight-icon">💳</span><div><strong>Cart Size Pattern:</strong> $19-$28 sweet spot. Don't discount below $15 — it kills perceived value.</div></div>
          <div class="cps-demos-insight"><span class="cps-demos-insight-icon">🔁</span><div><strong>Repeat Potential:</strong> Maria segment has 41% repeat rate — invest in email sequences for this group.</div></div>
        </div>
      </div>`;
  },

  renderAdCreatives(personas, product){
    const selected = personas[0];
    const headlines = AdHeadlines[selected.name] || AdHeadlines['Sarah Mitchell'];
    const pName = product.title?.split('—')[0]?.trim() || 'product';

    return `
      <div class="cps-ads-hero">
        <h3 class="cps-ads-title">✏️ Ad Copy & Creative Generator</h3>
        <p class="cps-ads-sub">Ready-to-use ad headlines, copy variations, and CTAs — optimized for each persona.</p>
      </div>

      <div class="cps-ads-formula-bar">
        <h4 class="cps-ads-section-title">🧮 Winning Headline Formulas</h4>
        <div class="cps-ads-formula-grid">
          <div class="cps-ads-formula"><strong>Problem-Agitate:</strong> "Stop wasting $X/month on [problem]"</div>
          <div class="cps-ads-formula"><strong>Social Proof:</strong> "X,XXX people switched to this — here's why"</div>
          <div class="cps-ads-formula"><strong>FOMO:</strong> "This [product] is selling out fast"</div>
          <div class="cps-ads-formula"><strong>Before/After:</strong> "From [problem] to [result]"</div>
          <div class="cps-ads-formula"><strong>Question Hook:</strong> "Why didn't anyone tell me about this?"</div>
          <div class="cps-ads-formula"><strong>Urgency:</strong> "50% OFF ends tonight"</div>
          <div class="cps-ads-formula"><strong>Curiosity:</strong> "The [product] everyone is adding to cart at 2am"</div>
        </div>
      </div>

      <div class="cps-ads-headlines">
        <h4 class="cps-ads-section-title">🎯 Headlines for ${esc(selected.name)}</h4>
        <div class="cps-ads-headline-cards">
          ${headlines.map(h=>`
            <div class="cps-ads-headline-card">
              <span class="cps-ads-hl-type">${esc(h.type)}</span>
              <div class="cps-ads-hl-text">${esc(h.headline.replace('${product}',pName))}</div>
              <div class="cps-ads-hl-cta">CTA: ${esc(h.cta)}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="cps-ads-copy-blocks">
        <h4 class="cps-ads-section-title">📝 Full Ad Copy Templates</h4>
        <div class="cps-ads-copy-grid">
          <div class="cps-ads-copy-card">
            <div class="cps-ads-copy-header">Facebook — Carousel Ad</div>
            <div class="cps-ads-copy-body">
              <p><strong>Hook (Slide 1):</strong> "Still wasting money on [product]s that don't work?"</p>
              <p><strong>Story (Slides 2-4):</strong> Show the problem → the product → the result. Each slide: 1 sentence max.</p>
              <p><strong>CTA (Slide 5):</strong> "Join 12,847 happy customers. Shop now →"</p>
              <p><strong>Primary Text:</strong> "I was skeptical too. But after 2 weeks of use, I get why this has 4,800+ reviews. Free shipping. 30-day guarantee. No risk."</p>
            </div>
          </div>
          <div class="cps-ads-copy-card">
            <div class="cps-ads-copy-header">TikTok — In-Feed 15s</div>
            <div class="cps-ads-copy-body">
              <p><strong>Hook (0-3s):</strong> "POV: you finally found the [product] that actually works"</p>
              <p><strong>Problem (3-6s):</strong> Show the frustration. "I've tried 5 different ones..."</p>
              <p><strong>Solution (6-12s):</strong> Product in action. "Then I found this."</p>
              <p><strong>CTA (12-15s):</strong> "Link in bio before it sells out 🏃‍♀️"</p>
            </div>
          </div>
          <div class="cps-ads-copy-card">
            <div class="cps-ads-copy-header">Instagram — Reel 30s</div>
            <div class="cps-ads-copy-body">
              <p><strong>Hook (0-2s):</strong> Text overlay: "Why didn't I buy this sooner?"</p>
              <p><strong>Reveal (2-8s):</strong> Show product in aesthetic setting. Trending audio.</p>
              <p><strong>Features (8-20s):</strong> 3 key benefits with text pop-ups</p>
              <p><strong>Social Proof (20-26s):</strong> "12,847 five-star reviews"</p>
              <p><strong>CTA (26-30s):</strong> "Tap to shop 👆" + urgency ("selling fast")</p>
            </div>
          </div>
        </div>
      </div>

      <div class="cps-ads-cta-section">
        <h4 class="cps-ads-section-title">🔘 CTA Button Options</h4>
        <div class="cps-ads-cta-grid">
          <div class="cps-ads-cta-pill">Shop Now</div>
          <div class="cps-ads-cta-pill">Get Yours →</div>
          <div class="cps-ads-cta-pill">See Reviews</div>
          <div class="cps-ads-cta-pill">Claim Discount</div>
          <div class="cps-ads-cta-pill">Try Risk-Free</div>
          <div class="cps-ads-cta-pill">Join 12K+ Customers</div>
          <div class="cps-ads-cta-pill">Learn More</div>
          <div class="cps-ads-cta-pill">Limited Offer</div>
        </div>
      </div>`;
  },

  renderEmails(personas, product){
    const selected = personas[0];
    const seq = EmailSequences[selected.name] || EmailSequences['Sarah Mitchell'];
    const pName = product.title?.split('—')[0]?.trim() || 'product';

    function renderEmailCard(email, type){
      return `
        <div class="cps-email-card">
          <div class="cps-email-type-badge">${esc(type)}</div>
          <div class="cps-email-subject">Subject: ${esc(email.subject.replace('${product}',pName))}</div>
          <div class="cps-email-body">${esc(email.body.replace('${product}',pName))}</div>
        </div>`;
    }

    return `
      <div class="cps-email-hero">
        <h3 class="cps-email-title">📧 Email Template Library</h3>
        <p class="cps-email-sub">Plug-and-play email sequences for welcome, abandoned cart, and post-purchase — crafted for ${esc(selected.name)}'s segment.</p>
      </div>

      <div class="cps-email-section">
        <h4 class="cps-email-section-title">📬 Welcome Sequence (3 emails, 7-day drip)</h4>
        <p class="cps-email-section-desc">Purpose: Turn subscriber into first-time buyer. Sent: Day 0, Day 2, Day 5.</p>
        <div class="cps-email-cards">
          ${seq.welcome.map((e,i)=>renderEmailCard(e,`Email ${i+1}`)).join('')}
        </div>
      </div>

      <div class="cps-email-section">
        <h4 class="cps-email-section-title">🛒 Abandoned Cart Recovery (3 emails, 48-hour window)</h4>
        <p class="cps-email-section-desc">Purpose: Recover lost sales. Sent: 1 hour, 24 hours, 48 hours after abandonment.</p>
        <div class="cps-email-cards">
          ${seq.abandoned.map((e,i)=>renderEmailCard(e,`Email ${i+1}`)).join('')}
        </div>
      </div>

      <div class="cps-email-section">
        <h4 class="cps-email-section-title">📦 Post-Purchase Flow (3 emails, 14-day drip)</h4>
        <p class="cps-email-section-desc">Purpose: Drive reviews, referrals, and repeat purchases. Sent: Day 1, Day 7, Day 14.</p>
        <div class="cps-email-cards">
          ${seq.postPurchase.map((e,i)=>renderEmailCard(e,`Email ${i+1}`)).join('')}
        </div>
      </div>

      <div class="cps-email-metrics">
        <h4 class="cps-email-section-title">📊 Expected Performance Metrics</h4>
        <div class="cps-email-metrics-grid">
          <div class="cps-email-metric"><span class="cps-email-metric-value">45-55%</span><span class="cps-email-metric-label">Welcome Open Rate</span></div>
          <div class="cps-email-metric"><span class="cps-email-metric-value">8-15%</span><span class="cps-email-metric-label">Cart Recovery Rate</span></div>
          <div class="cps-email-metric"><span class="cps-email-metric-value">12-18%</span><span class="cps-email-metric-label">Post-Purchase Review Rate</span></div>
          <div class="cps-email-metric"><span class="cps-email-metric-value">$15-$25</span><span class="cps-email-metric-label">Revenue Per Email</span></div>
        </div>
      </div>`;
  },

  renderLanding(product){
    const pName = product.title?.split('—')[0]?.trim() || 'product';

    return `
      <div class="cps-landing-hero">
        <h3 class="cps-landing-title">🏗️ Landing Page Blueprint</h3>
        <p class="cps-landing-sub">Section-by-section guide to build a high-converting product page for ${pName}.</p>
      </div>

      <div class="cps-landing-sections">
        ${LandingPageBlueprint.map((s,i)=>`
          <div class="cps-landing-card ${s.priority === 'Must Have' ? 'cps-landing-must' : s.priority === 'High Value' ? 'cps-landing-high' : 'cps-landing-opt'}">
            <div class="cps-landing-card-header">
              <span class="cps-landing-num">${i+1}</span>
              <span class="cps-landing-section-name">${s.section}</span>
              <span class="cps-landing-priority ${s.priority === 'Must Have' ? 'cps-priority-must' : s.priority === 'High Value' ? 'cps-priority-high' : 'cps-priority-opt'}">${s.priority}</span>
            </div>
            <div class="cps-landing-card-details">${s.details}</div>
            <div class="cps-landing-card-copy"><strong>Copy Strategy:</strong> ${s.copy}</div>
          </div>
        `).join('')}
      </div>

      <div class="cps-landing-checklist">
        <h4 class="cps-landing-section-title">✅ Pre-Launch Checklist</h4>
        <div class="cps-landing-checklist-items">
          <label class="cps-check-item"><input type="checkbox"> Hero headline matches winning ad copy (exact wording)</label>
          <label class="cps-check-item"><input type="checkbox"> Trust badges visible above fold (stars, review count, "as seen on")</label>
          <label class="cps-check-item"><input type="checkbox"> Mobile load time under 3 seconds</label>
          <label class="cps-check-item"><input type="checkbox"> CTA button color contrasts with background (tested with 5-second test)</label>
          <label class="cps-check-item"><input type="checkbox"> Product photos show scale (person holding it)</label>
          <label class="cps-check-item"><input type="checkbox"> At least 3 user-submitted review photos</label>
          <label class="cps-check-item"><input type="checkbox"> FAQ addresses top 5 objections from persona profile</label>
          <label class="cps-check-item"><input type="checkbox"> Return policy clearly visible (30-day minimum)</label>
          <label class="cps-check-item"><input type="checkbox"> Apple Pay / Google Pay enabled</label>
          <label class="cps-check-item"><input type="checkbox"> Urgency element is REAL (actual stock count or real deadline)</label>
          <label class="cps-check-item"><input type="checkbox"> A/B test plan ready (headline + CTA button color first)</label>
          <label class="cps-check-item"><input type="checkbox"> Pixel/conversion tracking verified on all key pages</label>
        </div>
      </div>`;
  },

  renderPlatforms(personas, product){
    const selected = personas[0];
    const strat = PlatformStrategies[selected.name] || PlatformStrategies['Sarah Mitchell'];

    return `
      <div class="cps-plat-hero">
        <h3 class="cps-plat-title">📱 Platform-Specific Ad Strategy</h3>
        <p class="cps-plat-sub">Budget allocation, creative formats, targeting, and optimal timing — per platform, per persona.</p>
      </div>

      <div class="cps-plat-tabs">
        <button class="cps-plat-tab active" data-platform="facebook">Facebook</button>
        <button class="cps-plat-tab" data-platform="instagram">Instagram</button>
        <button class="cps-plat-tab" data-platform="tiktok">TikTok</button>
        <button class="cps-plat-tab" data-platform="youtube">YouTube</button>
      </div>

      <div id="cpsPlatContent">
        ${renderPlatformCard('facebook', strat.facebook)}
      </div>

      <div class="cps-plat-roi">
        <h4 class="cps-plat-section-title">💰 Expected ROI by Platform</h4>
        <div class="cps-plat-roi-grid">
          <div class="cps-plat-roi-card"><div class="cps-plat-roi-platform">Facebook</div><div class="cps-plat-roi-value">3.2x ROAS</div><div class="cps-plat-roi-note">Best for retargeting + lookalikes</div></div>
          <div class="cps-plat-roi-card"><div class="cps-plat-roi-platform">Instagram</div><div class="cps-plat-roi-value">2.8x ROAS</div><div class="cps-plat-roi-note">Best for lifestyle + aesthetic products</div></div>
          <div class="cps-plat-roi-card"><div class="cps-plat-roi-platform">TikTok</div><div class="cps-plat-roi-value">4.1x ROAS</div><div class="cps-plat-roi-note">Best for viral potential + younger demos</div></div>
          <div class="cps-plat-roi-card"><div class="cps-plat-roi-platform">YouTube</div><div class="cps-plat-roi-value">2.5x ROAS</div><div class="cps-plat-roi-note">Best for high-consideration products</div></div>
        </div>
      </div>`;

    function renderPlatformCard(platform, data){
      return `
        <div class="cps-plat-card">
          <div class="cps-plat-card-header">
            <h4>${esc(platform.charAt(0).toUpperCase()+platform.slice(1))} Strategy</h4>
            <span class="cps-plat-budget">${esc(data.budget)}</span>
          </div>
          <div class="cps-plat-card-grid">
            <div class="cps-plat-detail">
              <h5>Ad Types</h5>
              <ul>${data.adTypes.map(a=>`<li>${esc(a)}</li>`).join('')}</ul>
            </div>
            <div class="cps-plat-detail">
              <h5>Targeting</h5>
              <p>${esc(data.targeting)}</p>
            </div>
            <div class="cps-plat-detail">
              <h5>Creative Direction</h5>
              <p>${esc(data.creative)}</p>
            </div>
            <div class="cps-plat-detail">
              <h5>Optimal Timing</h5>
              <p>${esc(data.optimal)}</p>
            </div>
          </div>
        </div>`;
    }
  }
};

PluginRegistry.register('customer-persona', CustomerPersonaPlugin);
})();

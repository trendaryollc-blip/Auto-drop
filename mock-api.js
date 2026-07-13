// ============================================================================
// MOCK API LAYER — Simulated backend with realistic data
// ============================================================================
// Provides 210+ products, 10 competitors, 50+ suppliers, ad intel, trends.
// Intercepts fetch() for /api/* routes. 200-800ms simulated latency.
// ============================================================================
(function(){
'use strict';

var _originalFetch = window.fetch;

// ===== SIMULATED LATENCY =====
function delayed(value, minMs, maxMs) {
  var ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise(function(resolve) { setTimeout(function() { resolve(value); }, ms); });
}

// ===== SEEDED RANDOM (deterministic per product index) =====
var _seed = 42;
function srand() { _seed = (_seed * 16807 + 0) % 2147483647; return (_seed - 1) / 2147483646; }
function pick(arr) { return arr[Math.floor(srand() * arr.length)]; }
function randInt(a, b) { return Math.floor(srand() * (b - a + 1)) + a; }
function randFloat(a, b) { return +(a + srand() * (b - a)).toFixed(2); }

// ===== IMAGE POOL (unsplash photo IDs by category) =====
var IMAGES = {
  electronics: [
    'photo-1590658268037-6bf12f032f55','photo-1505740420928-5e560c06d30e',
    'photo-1585386959984-a4155224a1ad','photo-1546868871-af0de0ae72be',
    'photo-1583394838336-acd977736f90','photo-1484704849700-f032a568e944',
    'photo-1524678606370-a47ad25cb82a','photo-1544244015-0df4b3ffc6b0',
    'photo-1558618666-fcd25c85f82e','photo-1586953208448-b95a79798f07',
    'photo-1611532736597-de2d4265fba3','photo-1572569511254-d8f925fe2cbb',
    'photo-1600003014755-ba31aa59c4b6','photo-1609091839311-d5365f9ff1c5',
    'photo-1628815113969-0487917e8b76','photo-1593642632559-0c6d3fc62b89'
  ],
  beauty: [
    'photo-1596462502278-27bfdc403348','photo-1512496015851-a90fb38ba796',
    'photo-1576091160550-2173dba999ef','photo-1571781926291-c477ebfd024b',
    'photo-1522335789203-aabd1fc54bc9','photo-1616394584738-fc6e612e71b9',
    'photo-1608248543803-ba4f8c70ae0b','photo-1583209814683-c023dd293cc6',
    'photo-1599733594230-6b823276abcc','photo-1611432579699-484f7990b127'
  ],
  home: [
    'photo-1534796636912-3b95b3ab5986','photo-1558618666-fcd25c85f82e',
    'photo-1507003211169-0a1dd7228f2d','photo-1493663284031-b7e3aefcae8e',
    'photo-1513694203232-719a280e022f','photo-1556909114-f6e7ad7d3136',
    'photo-1556228453-efd6c1ff04f6','photo-1540574163026-643ea20ade25',
    'photo-1507652313519-d4e9174996dd','photo-1556228720-195a672e8a03'
  ],
  pets: [
    'photo-1601758228041-f3b2795255f1','photo-1587300003388-59208cc962cb',
    'photo-1548199973-03cce0bbc87b','photo-1583511655857-d19b40a7a54e',
    'photo-1535930749574-1399327ce78f','photo-1537151625747-768eb6cf92b2',
    'photo-1450778869180-41d0601e046e','photo-1596854407944-bf87f6fdd49e'
  ],
  fashion: [
    'photo-1523170335258-f5ed11844a49','photo-1511499767150-a48a237f0083',
    'photo-1576566588028-4147f3842f27','photo-1560243563-062bfc001d68',
    'photo-1553062407-98eeb64c6a62','photo-1611085583191-a3b181a88401',
    'photo-1617038220319-276d3cfab638','photo-1576566588028-4147f3842f27'
  ],
  fitness: [
    'photo-1598289431512-b97b0917affc','photo-1571019613454-1cb2f99b2d8b',
    'photo-1517836357463-d25dfeac3438','photo-1534438327276-14e5300c3a48',
    'photo-1518611012118-696072aa579a','photo-1540497077202-7c8a3999166f',
    'photo-1576678927484-cc907957088c','photo-1574680096145-d05b474e2155'
  ],
  automotive: [
    'photo-1558618666-fcd25c85f82e','photo-1504215680853-026ed2a45def',
    'photo-1489824904134-891ab64532f1','photo-1605559424843-9e4c228bf1c2',
    'photo-1549317661-bd32c8ce0afa','photo-1541899481282-d53bffe3c35d'
  ],
  toys: [
    'photo-1558060370-d644479cb6f7','photo-1596461404969-9ae70f2830c1',
    'photo-1566576912321-d58ddd7a608c','photo-1587654780291-39c9404d7dd0',
    'photo-1515488042361-ee00e0ddd4e4','photo-1597696929736-6d13bed8e6a8'
  ],
  kitchen: [
    'photo-1556909114-f6e7ad7d3136','photo-1584568694244-14fbdf83bd30',
    'photo-1556910103-1c02745aae4d','photo-1590794056226-79ef3a8147e1',
    'photo-1600585154340-be6161a56a0c','photo-1556909172-54557c7e4fb7'
  ]
};

var CATEGORIES = [
  { name: 'Electronics', imgKey: 'electronics', subs: ['Wireless Earbuds','Bluetooth Speaker','Phone Charger','Power Bank','USB Hub','Screen Protector','Phone Case','Ring Light','Webcam','Smart Watch','Fitness Tracker','Wireless Mouse','Keyboard','Phone Stand','Cable','Car Mount','Dash Cam','Portable Charger','WiFi Extender','LED Strip Lights','USB-C Hub','Laptop Stand','Bluetooth Receiver','HDMI Cable','Smart Plug','Smart Scale','WiFi Router Mini','VR Headset Holder','Phone Cooler','Gaming Controller'] },
  { name: 'Health & Beauty', imgKey: 'beauty', subs: ['Face Massager','Hair Removal Device','Teeth Whitening Kit','Makeup Brush Set','Nail Drill Kit','Jade Roller','Derma Roller','Facial Steamer','Eyelash Curler','Hair Straightener Brush','Blackhead Remover','Skin Scrubber','Electric Shaver','Lip Plumper','Eyebrow Trimmer','Scalp Massager','Body Scrubber','Perfume Bottle','Hair Clipper','Electric Toothbrush','Face Cleansing Brush','Hair Growth Helmet','Neck Massager','Back Scrubber','Foot Spa Massager'] },
  { name: 'Home & Garden', imgKey: 'home', subs: ['LED Galaxy Projector','Smart LED Bulb','Wall Art Canvas','Storage Organizer','Scented Candle','Coffee Maker','Air Humidifier','Essential Oil Diffuser','Kitchen Timer','Bathroom Scale','Plant Pot','Curtain Lights','Bookshelf Light','Doorbell Camera','Night Light','Clock','Mirror','Rug','Throw Blanket','Wall Hooks','Candle Holder','Table Lamp','Picture Frame','Blanket Throw','Wind Chime','Garden Gnome','Bird Bath','Solar Path Light','Fairy Lights','Plant Stand'] },
  { name: 'Pets', imgKey: 'pets', subs: ['Pet Water Fountain','LED Dog Collar','Cat Tree Tower','Dog Toy Bundle','Pet Carrier Bag','Automatic Feeder','Dog Grooming Kit','Cat Scratching Post','Fish Tank Light','Bird Feeder','Pet Bed','Dog Leash','Cat Litter Mat','Pet Travel Bowl','Dog Raincoat','Cat Toy Interactive','Pet Camera','Dog Harness','Cat Collar','Pet Grooming Glove','Dog Booties','Pet Carrier Backpack','Fish Tank Decor','Hamster Wheel','Cat Window Perch'] },
  { name: 'Fashion', imgKey: 'fashion', subs: ['Sunglasses','Necklace Set','Bracelet Pack','Earring Collection','Watch','Crossbody Bag','Scarf','Hat','Belt','Hair Clips Set','Ring Set','Anklet','Brooch Pin','Headband','Wallet','Keychain Set','Lapel Pin','Tie Set','Cufflinks','Shoe Charms','Hair Ties','Body Chain','Choker Set','Arm Cuff','Toe Ring'] },
  { name: 'Fitness', imgKey: 'fitness', subs: ['Yoga Mat','Resistance Bands','Jump Rope','Foam Roller','Gym Bag','Water Bottle','Workout Gloves','Ab Roller','Pull-Up Bar','Balance Board','Kettlebell','Exercise Wheel','Posture Corrector','Massage Gun','Swimming Goggles','Yoga Block','Gym Towel','Ankle Weights','Hand Grip','Wrist Wraps','Running Belt','Shin Guards','Boxing Gloves','Kickboard','Leggings Set'] },
  { name: 'Automotive', imgKey: 'automotive', subs: ['Car Phone Mount','Seat Cover Set','Car Air Purifier','Car Charger','Car Vacuum','Sunshade','Trunk Organizer','LED Interior Light','Car Fragrance','Backup Camera','Floor Mats','Steering Wheel Cover','Car Trash Can','Parking Sensor','Tire Pressure Gauge','Car Jump Starter','Dash Camera','Car Cover','Windshield Shade','Roof Rack','Bike Rack','License Plate Frame','Car Key Cover','Wiper Blades','Car Polish Kit'] },
  { name: 'Toys & Games', imgKey: 'toys', subs: ['RC Car','Puzzle Set','Building Blocks','Water Gun','Board Game','Fidget Toy','Drone Mini','Nerf Gun','Play Dough Kit','Magnetic Tiles','STEM Robot','Science Kit','Art Set','Musical Instrument','Outdoor Game','Rubik Cube','Slime Kit','Remote Control Boat','Toy Gun','Puppet Theater','Train Set','Dinosaur Figure','Robot Dog','Bubble Machine','Sand Toy Set'] },
  { name: 'Kitchen', imgKey: 'kitchen', subs: ['Portable Blender','Milk Frother','Knife Set','Silicone Spatula','Food Scale','Ice Cube Mold','Tea Infuser','Garlic Press','Avocado Slicer','Herb Scissors','Egg Cooker','Bread Box','Spice Rack','Meat Thermometer','Coffee Grinder','Pizza Cutter','Bottle Opener','Colander Set','Cutting Board','Whisk Set','Can Opener','Ladle Set','Peeler Set','Mold Set','Grater Set'] }
];

var PLATFORMS = ['aliexpress','amazon','shopify','ebay','temu','tiktok','etsy','cjdropshipping','dhgate','wish'];
var PLATFORM_PRICEScales = { aliexpress:1, amazon:3.2, shopify:3.8, ebay:2.8, temu:0.85, tiktok:2.2, etsy:3.5, cjdropshipping:0.9, dhgate:0.75, wish:1.15 };

var SUPPLIER_POOL = [
  { name:'Shenzhen TechParts Co.', loc:'Shenzhen, CN', specialty:'Electronics', year:2015, emp:'50-100', cert:['ISO9001','CE','FCC'], moq:50 },
  { name:'Yiwu Smart Trading', loc:'Yiwu, CN', specialty:'General Merchandise', year:2012, emp:'20-50', cert:['ISO9001'], moq:100 },
  { name:'Guangzhou Beauty Supplies', loc:'Guangzhou, CN', specialty:'Health & Beauty', year:2016, emp:'30-60', cert:['ISO9001','GMP','FDA'], moq:30 },
  { name:'Dongguan Electronics Ltd', loc:'Dongguan, CN', specialty:'Electronics', year:2010, emp:'100-200', cert:['ISO9001','ISO14001','CE','RoHS'], moq:100 },
  { name:'Ningbo Home Goods Co.', loc:'Ningbo, CN', specialty:'Home & Garden', year:2014, emp:'40-80', cert:['ISO9001','BSCI'], moq:50 },
  { name:'Shenzhen GlowTech', loc:'Shenzhen, CN', specialty:'LED Products', year:2017, emp:'20-50', cert:['CE','FCC','RoHS'], moq:20 },
  { name:'Yiwu Pet Supplies Factory', loc:'Yiwu, CN', specialty:'Pet Products', year:2013, emp:'30-60', cert:['ISO9001','BSCI'], moq:100 },
  { name:'Guangzhou Fashion Accessories', loc:'Guangzhou, CN', specialty:'Fashion', year:2011, emp:'50-100', cert:['ISO9001'], moq:50 },
  { name:'Shenzhen FitGear Direct', loc:'Shenzhen, CN', specialty:'Fitness Equipment', year:2018, emp:'20-50', cert:['ISO9001','CE'], moq:30 },
  { name:'Dongguan AutoParts Co.', loc:'Dongguan, CN', specialty:'Automotive', year:2009, emp:'100-200', cert:['ISO9001','ISO/TS16949','CE'], moq:100 },
  { name:'Hangzhou Smart Home', loc:'Hangzhou, CN', specialty:'Smart Home', year:2016, emp:'30-60', cert:['ISO9001','CE','FCC'], moq:20 },
  { name:'Shenzhen AudioPro Store', loc:'Shenzhen, CN', specialty:'Audio Equipment', year:2014, emp:'40-80', cert:['ISO9001','CE','FCC'], moq:30 },
  { name:'Yiwu Jewelry Wholesale', loc:'Yiwu, CN', specialty:'Fashion Jewelry', year:2010, emp:'50-100', cert:['ISO9001','Lead-Free'], moq:200 },
  { name:'Guangzhou HealthFirst Co.', loc:'Guangzhou, CN', specialty:'Health Products', year:2015, emp:'30-60', cert:['ISO9001','GMP','FDA'], moq:50 },
  { name:'Ningbo KitchenWiz', loc:'Ningbo, CN', specialty:'Kitchen Gadgets', year:2013, emp:'40-80', cert:['ISO9001','FDA','LFGB'], moq:50 },
  { name:'Shenzhen PostureTech', loc:'Shenzhen, CN', specialty:'Health & Wellness', year:2019, emp:'10-30', cert:['ISO9001','CE'], moq:20 },
  { name:'Dongguan StarLight Tech', loc:'Dongguan, CN', specialty:'LED & Lighting', year:2017, emp:'20-50', cert:['CE','FCC','RoHS'], moq:30 },
  { name:'Shenzhen ChargeTech Pro', loc:'Shenzhen, CN', specialty:'Chargers & Cables', year:2012, emp:'100-200', cert:['ISO9001','CE','FCC','MFi'], moq:100 },
  { name:'Guangzhou GlamTools Co.', loc:'Guangzhou, CN', specialty:'Beauty Tools', year:2016, emp:'20-50', cert:['ISO9001','CE'], moq:20 },
  { name:'Yiwu FitGear Pro', loc:'Yiwu, CN', specialty:'Fitness Gear', year:2015, emp:'30-60', cert:['ISO9001','BSCI'], moq:100 },
  { name:'Shenzhen PetEase Supplies', loc:'Shenzhen, CN', specialty:'Pet Products', year:2018, emp:'20-50', cert:['ISO9001'], moq:50 },
  { name:'Hangzhou EcoKitchen', loc:'Hangzhou, CN', specialty:'Eco Kitchen', year:2020, emp:'10-30', cert:['ISO9001','FDA','BPA-Free'], moq:30 },
  { name:'Dongguan CreatorGear Co.', loc:'Dongguan, CN', specialty:'Content Creator Gear', year:2019, emp:'10-30', cert:['CE','FCC'], moq:20 },
  { name:'Ningbo BrewTech Co.', loc:'Ningbo, CN', specialty:'Coffee & Kitchen', year:2014, emp:'30-60', cert:['ISO9001','FDA','LFGB'], moq:50 },
  { name:'Shenzhen SoundTech Pro', loc:'Shenzhen, CN', specialty:'Audio & Speakers', year:2013, emp:'50-100', cert:['ISO9001','CE','FCC'], moq:50 },
  { name:'Yiwu NightPaws Store', loc:'Yiwu, CN', specialty:'Pet Accessories', year:2017, emp:'10-30', cert:['ISO9001'], moq:100 },
  { name:'Guangzhou LashPro Store', loc:'Guangzhou, CN', specialty:'Eyelash Products', year:2018, emp:'10-30', cert:['ISO9001','GMP'], moq:20 },
  { name:'Shenzhen TripodTech', loc:'Shenzhen, CN', specialty:'Phone Accessories', year:2016, emp:'20-50', cert:['ISO9001','CE'], moq:30 },
  { name:'Dongguan GlowDecor', loc:'Dongguan, CN', specialty:'Home Decor', year:2019, emp:'10-30', cert:['CE','RoHS'], moq:20 },
  { name:'Hangzhou CleanTech Labs', loc:'Hangzhou, CN', specialty:'Home Technology', year:2015, emp:'30-60', cert:['ISO9001','CE','FCC'], moq:50 },
  { name:'Shenzhen ProjectPro Tech', loc:'Shenzhen, CN', specialty:'Projectors & Displays', year:2017, emp:'20-50', cert:['CE','FCC','RoHS'], moq:20 },
  { name:'Ningbo BlendPro Co.', loc:'Ningbo, CN', specialty:'Kitchen Appliances', year:2018, emp:'20-50', cert:['ISO9001','FDA','LFGB'], moq:30 },
  { name:'Yiwu HappyPaws Co.', loc:'Yiwu, CN', specialty:'Pet Supplies', year:2014, emp:'30-60', cert:['ISO9001','BSCI'], moq:100 },
  { name:'Guangzhou BeautyGlow Co.', loc:'Guangzhou, CN', specialty:'Beauty Products', year:2016, emp:'20-50', cert:['ISO9001','GMP'], moq:20 },
  { name:'Dongguan AeroFly Direct', loc:'Dongguan, CN', specialty:'Drones & RC', year:2015, emp:'30-60', cert:['ISO9001','CE','FCC'], moq:20 },
  { name:'Shenzhen SkyVision Tech', loc:'Shenzhen, CN', specialty:'Drone Cameras', year:2016, emp:'20-50', cert:['ISO9001','CE','FCC'], moq:10 },
  { name:'Hangzhou SmartLife Co.', loc:'Hangzhou, CN', specialty:'Smart Gadgets', year:2019, emp:'10-30', cert:['CE','FCC'], moq:20 },
  { name:'Ningbo FreshAir Tech', loc:'Ningbo, CN', specialty:'Air Purifiers', year:2017, emp:'20-50', cert:['ISO9001','CE','HEPA'], moq:30 },
  { name:'Shenzhen AutoGear Pro', loc:'Shenzhen, CN', specialty:'Car Accessories', year:2011, emp:'100-200', cert:['ISO9001','ISO/TS16949','CE'], moq:100 },
  { name:'Yiwu CuteLight Co.', loc:'Yiwu, CN', specialty:'Novelty Lights', year:2020, emp:'10-30', cert:['CE','RoHS'], moq:50 },
  { name:'Guangzhou PowerWave Co.', loc:'Guangzhou, CN', specialty:'Wireless Charging', year:2018, emp:'20-50', cert:['ISO9001','Qi','CE','FCC'], moq:30 },
  { name:'Dongguan PetGlow Co.', loc:'Dongguan, CN', specialty:'Pet Tech', year:2019, emp:'10-30', cert:['CE','FCC'], moq:30 },
  { name:'Shenzhen ChargePro Store', loc:'Shenzhen, CN', specialty:'Mobile Charging', year:2014, emp:'50-100', cert:['ISO9001','MFi','CE','FCC'], moq:100 },
  { name:'Hangzhou HomeCinema Store', loc:'Hangzhou, CN', specialty:'Home Entertainment', year:2016, emp:'20-50', cert:['ISO9001','CE'], moq:20 },
  { name:'Ningbo PestFree Co.', loc:'Ningbo, CN', specialty:'Pest Control', year:2015, emp:'20-50', cert:['ISO9001','EPA','CE'], moq:50 },
  { name:'Yiwu GymLife Co.', loc:'Yiwu, CN', specialty:'Gym Equipment', year:2017, emp:'20-50', cert:['ISO9001','BSCI'], moq:100 },
  { name:'Shenzhen DriveSmart Co.', loc:'Shenzhen, CN', specialty:'Car Electronics', year:2013, emp:'50-100', cert:['ISO9001','CE','FCC'], moq:50 },
  { name:'Guangzhou AudioMax Co.', loc:'Guangzhou, CN', specialty:'Speakers & Audio', year:2012, emp:'50-100', cert:['ISO9001','CE','FCC'], moq:50 },
  { name:'Dongguan StarLight Store', loc:'Dongguan, CN', specialty:'Lighting', year:2018, emp:'20-50', cert:['CE','RoHS','FCC'], moq:20 },
  { name:'US TechDrop LLC', loc:'Los Angeles, US', specialty:'General Dropshipping', year:2019, emp:'5-10', cert:['BBB'], moq:1 },
  { name:'EuroDrop Trading GmbH', loc:'Berlin, DE', specialty:'EU Fulfillment', year:2020, emp:'5-10', cert:['CE'], moq:1 }
];

var SUPPLIERS = SUPPLIER_POOL.map(function(s, i) {
  return {
    id: 'sup-' + (i + 1),
    name: s.name,
    location: s.loc,
    rating: randFloat(3.8, 5.0),
    orders: randInt(5, 400) + 'K',
    responseTime: pick(['< 1h','< 2h','< 3h','< 4h','< 6h','< 12h']),
    verified: srand() > 0.15,
    specialty: s.specialty,
    yearEstablished: s.year,
    employeeCount: s.emp,
    shippingMethods: pick([['ePacket','AliExpress Standard'],['DHL','FedEx','UPS'],['Cainiao','Yanwen'],['Royal Mail','USPS']]),
    moq: s.moq,
    certifications: s.cert,
    description: s.specialty + ' manufacturer & exporter. ' + s.emp + ' employees. Est. ' + s.year + '.'
  };
});

// ===== PRODUCT GENERATOR =====
function generateProducts() {
  var products = [];
  var id = 1;

  for (var c = 0; c < CATEGORIES.length; c++) {
    var cat = CATEGORIES[c];
    var imgPool = IMAGES[cat.imgKey] || IMAGES.electronics;
    var perCat = cat.subs.length;
    for (var s = 0; s < perCat; s++) {
      var sub = cat.subs[s];
      var platform = PLATFORMS[id % PLATFORMS.length];
      var baseCost = randFloat(2, 45);
      var margin = randInt(62, 88);
      var sellingPrice = +(baseCost / (1 - margin / 100)).toFixed(2);
      var score = randInt(62, 98);
      var sales = randInt(800, 8500);
      var comp = pick(['low','low','medium','medium','medium','high']);
      var demand = randInt(55, 98);
      var rev = randFloat(3.5, 7.5);
      var ordersK = randInt(2, 350) + 'K';

      var platPrices = {};
      var keys = Object.keys(PLATFORM_PRICEScales);
      for (var k = 0; k < keys.length; k++) {
        platPrices[keys[k]] = +(baseCost * PLATFORM_PRICEScales[keys[k]]).toFixed(2);
      }

      var trendBase = randInt(80, 300);
      var trendGrowth = randFloat(1.05, 1.25);
      var trendData = [];
      var val = trendBase;
      for (var m = 0; m < 12; m++) {
        val = Math.round(val * (1 + (srand() * 0.3 - 0.05)));
        trendData.push(val);
      }

      var seasonBase = randInt(70, 110);
      var seasonality = [];
      for (var m2 = 0; m2 < 12; m2++) {
        seasonality.push(Math.round(seasonBase + srand() * 40 - 15));
      }

      var ageRanges = ['14-24','16-28','18-30','18-34','18-40','20-35','20-45','22-50','25-45','25-55','30-60'];
      var genders = ['All','All','All','Male','Female'];
      var interestPool = ['Tech','Fitness','Travel','Music','Gaming','Cooking','Pets','Fashion','Beauty','Home','Cars','Outdoor','Health','Kids','Art'];
      var countryPool = ['US','UK','DE','AU','CA','BR','IN','FR','JP','KR','MX','ES','IT','NL','SE'];

      var nSuppliers = randInt(1, 3);
      var prodSuppliers = [];
      var usedSup = {};
      for (var si = 0; si < nSuppliers; si++) {
        var sIdx;
        do { sIdx = randInt(0, SUPPLIERS.length - 1); } while (usedSup[sIdx]);
        usedSup[sIdx] = true;
        var sup = SUPPLIERS[sIdx];
        prodSuppliers.push({ name: sup.name, location: sup.location, rating: sup.rating, orders: sup.orders, responseTime: sup.responseTime, verified: sup.verified });
      }

      var keywords = [];
      var kwPool = sub.toLowerCase().split(' ');
      for (var kw = 0; kw < kwPool.length; kw++) { if (kwPool[kw].length > 2) keywords.push(kwPool[kw]); }
      keywords.push(cat.name.toLowerCase().replace(/ & /g, ' '));
      keywords.push(platform + ' bestseller');
      if (srand() > 0.5) keywords.push('trending 2026');
      if (srand() > 0.6) keywords.push('viral');

      var badges = [];
      if (score > 85) badges.push('trending');
      if (score > 90) badges.push('hot');
      if (margin > 78 && comp === 'low') badges.push('winning');
      if (srand() > 0.7) badges.push('ai');
      if (srand() > 0.85) badges.push('new');
      if (badges.length === 0) badges.push('trending');

      var insights = [
        'Strong opportunity in ' + cat.name.toLowerCase() + ' niche. ' + (comp === 'low' ? 'Low competition = early mover advantage.' : 'Moderate competition but large addressable market.') + ' Recommend ' + pick(['TikTok','Instagram','Facebook','YouTube']) + ' marketing.',
        'High-demand product with ' + margin + '% margins. ' + (sales > 4000 ? 'Excellent sales velocity.' : 'Steady demand curve.') + ' Bundle opportunities with related items.',
        pick(['Viral potential on social media.','Strong repeat purchase rate.','Gift-friendly price point.','Seasonal peaks in Q4.','Evergreen product with consistent demand.']) + ' ' + pick(['Multi-platform listing recommended.','Focus on ' + platform + ' first.','Expand to Shopify for higher margins.']),
        'AI analysis: ' + pick(['Underserved niche with growing search volume.','Strong review velocity indicates product-market fit.','Price point optimal for impulse purchases.','Content-driven marketing will outperform paid ads.'])
      ];

      products.push({
        id: id,
        title: sub + ' — ' + pick(['Premium','Pro','Elite','Plus','Max','Ultra','Smart','Mini','Advanced','Essential']) + ' ' + pick(['Edition','Version','Model','Series','2026','Upgrade','Plus','Kit']),
        image: 'https://images.unsplash.com/' + pick(imgPool) + '?w=400&h=400&fit=crop',
        platform: platform,
        price: sellingPrice,
        originalPrice: +(sellingPrice * randFloat(1.8, 3.5)).toFixed(2),
        margin: margin,
        score: score,
        badges: badges,
        salesVelocity: sales,
        competition: comp,
        demand: demand,
        rating: randFloat(3.8, 4.9),
        reviews: randInt(200, 35000),
        orders: ordersK,
        shipFrom: pick(['China','China','China','China','China','US','EU']),
        category: cat.name,
        keywords: keywords,
        suppliers: prodSuppliers,
        platformPrices: platPrices,
        trendData: trendData,
        seasonality: seasonality,
        audience: {
          age: pick(ageRanges),
          gender: pick(genders),
          interests: (function() { var r = []; for (var x = 0; x < 4; x++) r.push(pick(interestPool)); return r; })(),
          countries: (function() { var r = []; for (var x = 0; x < 5; x++) r.push(pick(countryPool)); return r; })()
        },
        riskScore: randInt(10, 70),
        marketSaturation: randInt(15, 80),
        adSpendAvg: randFloat(1.2, 7.0),
        cpaAvg: randFloat(1.5, 9.5),
        aiInsight: pick(insights)
      });
      id++;
    }
  }
  return products;
}

var PRODUCTS = generateProducts();

// ===== COMPETITORS =====
var Competitors = [
  {id:'c1',name:'PetLover Store',platform:'Shopify',url:'petlover.myshopify.com',revenue:48200,traffic:32400,convRate:3.2,ads:23,products:156,lastActive:'2 min ago',avatar:'P',color:'var(--accent-green)',age:'14 months',theme:'Dawn',apps:['Klaviyo','Loox','DSers','Tidio'],pageSpeed:92,seoScore:88,bounceRate:34,sessionMin:4.2,social:{fb:12400,ig:28900,tk:45200},topCountries:['US','UK','CA'],cat:'Pet Supplies'},
  {id:'c2',name:'TechGadget Hub',platform:'Shopify',url:'techgadget.myshopify.com',revenue:32100,traffic:21800,convRate:2.9,ads:18,products:89,lastActive:'5 min ago',avatar:'T',color:'var(--accent-cyan)',age:'9 months',theme:'Refresh',apps:['Oberlo','Judge.me','PushOwl','ReConvert'],pageSpeed:78,seoScore:72,bounceRate:42,sessionMin:3.1,social:{fb:8200,ig:15600,tk:31400},topCountries:['US','DE','AU'],cat:'Tech Gadgets'},
  {id:'c3',name:'BeautyGlow',platform:'Shopify',url:'beautyglow.myshopify.com',revenue:28400,traffic:19200,convRate:3.5,ads:31,products:203,lastActive:'1 min ago',avatar:'B',color:'var(--accent-pink)',age:'18 months',theme:'Sense',apps:['Klaviyo','Yotpo','Stamped','Gorgias'],pageSpeed:85,seoScore:91,bounceRate:28,sessionMin:5.1,social:{fb:18700,ig:52300,tk:67800},topCountries:['US','FR','BR'],cat:'Beauty & Skincare'},
  {id:'c4',name:'FitGear Pro',platform:'Shopify',url:'fitgearpro.myshopify.com',revenue:19600,traffic:14100,convRate:2.7,ads:12,products:67,lastActive:'8 min ago',avatar:'F',color:'var(--accent-orange)',age:'6 months',theme:'Craft',apps:['Spocket','Vitals','Wishlist','HelpCenter'],pageSpeed:71,seoScore:65,bounceRate:48,sessionMin:2.4,social:{fb:4500,ig:9800,tk:18700},topCountries:['US','CA','UK'],cat:'Fitness'},
  {id:'c5',name:'HomeEssentials',platform:'Shopify',url:'homeessentials.myshopify.com',revenue:41800,traffic:28500,convRate:3.8,ads:27,products:245,lastActive:'3 min ago',avatar:'H',color:'var(--accent-cyan)',age:'22 months',theme:'Dawn',apps:['Klaviyo','Loox','AliReviews','Tidio'],pageSpeed:89,seoScore:85,bounceRate:31,sessionMin:4.5,social:{fb:15200,ig:34100,tk:52600},topCountries:['US','UK','AU','CA'],cat:'Home & Living'},
  {id:'c6',name:'Kawaii Corner',platform:'Shopify',url:'kawaiicorner.myshopify.com',revenue:15300,traffic:11200,convRate:3.1,ads:9,products:98,lastActive:'12 min ago',avatar:'K',color:'var(--accent-pink)',age:'7 months',theme:'Sense',apps:['Oberlo','Judge.me','Privy'],pageSpeed:82,seoScore:76,bounceRate:38,sessionMin:3.8,social:{fb:6800,ig:21400,tk:38900},topCountries:['US','JP','KR','UK'],cat:'Kawaii & Gifts'},
  {id:'c7',name:'ChargeTech Direct',platform:'Shopify',url:'chargetechdirect.myshopify.com',revenue:37500,traffic:25100,convRate:3.4,ads:20,products:72,lastActive:'4 min ago',avatar:'C',color:'var(--accent-cyan)',age:'11 months',theme:'Refresh',apps:['DSers','Vitals','ReConvert','Klaviyo'],pageSpeed:86,seoScore:82,bounceRate:33,sessionMin:3.9,social:{fb:11300,ig:19800,tk:29400},topCountries:['US','DE','IN'],cat:'Electronics'},
  {id:'c8',name:'EcoKitchen Co',platform:'Shopify',url:'ecokitchen.myshopify.com',revenue:22700,traffic:16800,convRate:3.0,ads:15,products:118,lastActive:'6 min ago',avatar:'E',color:'var(--accent-green)',age:'10 months',theme:'Craft',apps:['Spocket','Yotpo','Omnisend','Gorgias'],pageSpeed:79,seoScore:74,bounceRate:40,sessionMin:3.2,social:{fb:7600,ig:13200,tk:22100},topCountries:['US','UK','CA','AU'],cat:'Kitchen & Eco'},
  {id:'c9',name:'PostureTech Wellness',platform:'Shopify',url:'posturetech.myshopify.com',revenue:18900,traffic:13600,convRate:2.8,ads:11,products:45,lastActive:'15 min ago',avatar:'W',color:'var(--accent-orange)',age:'5 months',theme:'Dawn',apps:['Oberlo','Judge.me','PushOwl'],pageSpeed:74,seoScore:69,bounceRate:44,sessionMin:2.8,social:{fb:5400,ig:11800,tk:26300},topCountries:['US','UK','IN','AU'],cat:'Health & Wellness'},
  {id:'c10',name:'StarLight Decor',platform:'Shopify',url:'starlightdecor.myshopify.com',revenue:26100,traffic:18400,convRate:3.3,ads:19,products:134,lastActive:'7 min ago',avatar:'S',color:'var(--accent-purple)',age:'13 months',theme:'Sense',apps:['Klaviyo','Loox','Stamped','Tidio'],pageSpeed:88,seoScore:86,bounceRate:30,sessionMin:4.6,social:{fb:13500,ig:31200,tk:48700},topCountries:['US','UK','BR','MX'],cat:'Home Decor'}
];

var LiveAds = [
  {id:'a1',competitor:'PetLover Store',platform:'Facebook',product:'Automatic Pet Water Fountain',headline:'Your Pet Deserves Fresh Water 24/7',body:'Ultra-quiet pump, 2L capacity. Vet recommended. Free shipping on orders $30+',cta:'Shop Now',spend:'$2.4K',impressions:'120K',clicks:'3.2K',engagement:'4.8%',status:'active',startedAgo:'3 days ago'},
  {id:'a2',competitor:'PetLover Store',platform:'TikTok',product:'LED Dog Collar',headline:'Night Walks Just Got Safer',body:'USB rechargeable glow collar. 3 modes. 100% waterproof. #PetSafety #DogTok',cta:'Get Yours',spend:'$1.8K',impressions:'280K',clicks:'8.5K',engagement:'6.2%',status:'active',startedAgo:'1 week ago'},
  {id:'a3',competitor:'TechGadget Hub',platform:'Facebook',product:'Wireless Bluetooth Earbuds',headline:' ANC Noise Cancelling — $29.99',body:'Studio quality sound. 40hr battery. Bluetooth 5.3. 30-day money back.',cta:'Buy Now',spend:'$3.1K',impressions:'95K',clicks:'2.8K',engagement:'3.9%',status:'active',startedAgo:'2 days ago'},
  {id:'a4',competitor:'BeautyGlow',platform:'Instagram',product:'Heated Eyelash Curler',headline:'Lift & Curl in 10 Seconds',body:'USB rechargeable. Salon results at home. 50K+ happy customers.',cta:'Shop Beauty',spend:'$2.7K',impressions:'185K',clicks:'5.1K',engagement:'7.1%',status:'active',startedAgo:'5 days ago'},
  {id:'a5',competitor:'BeautyGlow',platform:'TikTok',product:'Electric Mascara Curler',headline:'This beauty tool went VIRAL',body:'Before/after results that speak for themselves. Link in bio.',cta:'Shop Now',spend:'$4.2K',impressions:'520K',clicks:'15.3K',engagement:'8.4%',status:'active',startedAgo:'2 weeks ago'},
  {id:'a6',competitor:'FitGear Pro',platform:'Facebook',product:'Resistance Bands Set',headline:'Home Gym in a Bag — 5 Levels',body:'Professional-grade latex. Carry pouch included. Join 100K+ fitness fans.',cta:'Order Today',spend:'$1.5K',impressions:'78K',clicks:'2.1K',engagement:'3.5%',status:'paused',startedAgo:'10 days ago'},
  {id:'a7',competitor:'HomeEssentials',platform:'Facebook',product:'LED Galaxy Projector',headline:'Turn Your Room Into a Galaxy',body:'16 colors. WiFi + Bluetooth. Remote control. The #1 mood light of 2026.',cta:'Transform Your Space',spend:'$3.8K',impressions:'145K',clicks:'4.6K',engagement:'5.9%',status:'active',startedAgo:'4 days ago'},
  {id:'a8',competitor:'HomeEssentials',platform:'Instagram',product:'Smart WiFi LED Bulb',headline:'Voice Control Your Lighting',body:'Works with Alexa & Google. 16M colors. Set schedules. Energy saving.',cta:'Get Smart',spend:'$2.1K',impressions:'92K',clicks:'2.9K',engagement:'4.2%',status:'active',startedAgo:'1 week ago'},
  {id:'c9a',competitor:'Kawaii Corner',platform:'TikTok',product:'Cactus LED Night Light',headline:'Kawaii Room Decor That Slaps',body:'Touch dimming. Silicone. Safe for kids. The cutest night light ever.',cta:'Link in Bio',spend:'$1.9K',impressions:'310K',clicks:'9.8K',engagement:'9.1%',status:'active',startedAgo:'6 days ago'},
  {id:'a10',competitor:'ChargeTech Direct',platform:'Facebook',product:'Wireless Charging Pad',headline:'15W Fast Charging for All Qi Devices',body:'Sleek design. LED indicator. foreign object detection. $19.99.',cta:'Charge Faster',spend:'$2.5K',impressions:'88K',clicks:'2.4K',engagement:'3.6%',status:'active',startedAgo:'3 days ago'},
  {id:'a11',competitor:'EcoKitchen Co',platform:'Instagram',product:'Portable Blender',headline:'Smoothies Anywhere — USB Powered',body:'380ml capacity. 6 blades. USB-C rechargeable. BPA free.',cta:'Blend & Go',spend:'$1.6K',impressions:'72K',clicks:'2.0K',engagement:'4.5%',status:'paused',startedAgo:'2 weeks ago'},
  {id:'a12',competitor:'PostureTech Wellness',platform:'TikTok',product:'Smart Neck Posture Corrector',headline:'Fix Your Posture in 14 Days',body:'Vibration reminder. Smart sensor. USB rechargeable. #WFH #HealthTok',cta:'Get Yours',spend:'$2.8K',impressions:'380K',clicks:'11.2K',engagement:'7.8%',status:'active',startedAgo:'1 week ago'},
  {id:'a13',competitor:'StarLight Decor',platform:'Facebook',product:'Cactus LED Night Light',headline:'The Perfect Gift Under $20',body:'Touch dimming. 7 colors. Silicone material. 10K+ 5-star reviews.',cta:'Gift Ideas',spend:'$1.4K',impressions:'65K',clicks:'1.8K',engagement:'3.8%',status:'active',startedAgo:'5 days ago'},
  {id:'a14',competitor:'TechGadget Hub',platform:'TikTok',product:'Mini Portable Projector',headline:'Movie Night in Your Backyard',body:'1080P HD. WiFi. 200" screen. Built-in speaker. #MovieNight',cta:'Order Now',spend:'$3.5K',impressions:'420K',clicks:'12.8K',engagement:'6.5%',status:'active',startedAgo:'3 days ago'},
  {id:'a15',competitor:'FitGear Pro',platform:'Instagram',product:'Posture Corrector Belt',headline:'Stand Tall, Feel Great',body:'Invisible under clothes. Doctor designed. 30-day challenge results.',cta:'Start Now',spend:'$1.2K',impressions:'55K',clicks:'1.5K',engagement:'4.0%',status:'paused',startedAgo:'3 weeks ago'}
];

var PriceChanges = [
  {competitor:'PetLover Store',product:'Pet Water Fountain',oldPrice:44.99,newPrice:39.99,date:'2026-07-10',change:'-11%'},
  {competitor:'TechGadget Hub',product:'Wireless Earbuds Pro',oldPrice:34.99,newPrice:29.99,date:'2026-07-09',change:'-14%'},
  {competitor:'BeautyGlow',product:'Heated Eyelash Curler',oldPrice:22.99,newPrice:18.99,date:'2026-07-08',change:'-17%'},
  {competitor:'HomeEssentials',product:'Galaxy Projector',oldPrice:49.99,newPrice:35.99,date:'2026-07-07',change:'-28%'},
  {competitor:'Kawaii Corner',product:'Cactus Night Light',oldPrice:19.99,newPrice:14.99,date:'2026-07-06',change:'-25%'},
  {competitor:'ChargeTech Direct',product:'Wireless Charger',oldPrice:24.99,newPrice:19.99,date:'2026-07-05',change:'-20%'},
  {competitor:'EcoKitchen Co',product:'Portable Blender',oldPrice:34.99,newPrice:27.99,date:'2026-07-04',change:'-20%'},
  {competitor:'PostureTech Wellness',product:'Neck Posture Corrector',oldPrice:39.99,newPrice:34.99,date:'2026-07-03',change:'-13%'},
  {competitor:'StarLight Decor',product:'LED Star Projector',oldPrice:42.99,newPrice:29.99,date:'2026-07-02',change:'-30%'},
  {competitor:'FitGear Pro',product:'Resistance Band Set',oldPrice:16.99,newPrice:12.99,date:'2026-07-01',change:'-24%'},
  {competitor:'TechGadget Hub',product:'Mini Projector 1080P',oldPrice:99.99,newPrice:89.99,date:'2026-06-30',change:'-10%'},
  {competitor:'BeautyGlow',product:'Mascara Volume Kit',oldPrice:27.99,newPrice:22.99,date:'2026-06-29',change:'-18%'}
];

var AdSpendIntel = [
  {competitor:'PetLover Store',totalSpend:'$8.2K',daily:'$273',platforms:{facebook:3200,tiktok:3800,instagram:1200},topAd:'Pet Water Fountain',avgCPM:'$6.80',avgCPC:'$0.24'},
  {competitor:'TechGadget Hub',totalSpend:'$12.5K',daily:'$417',platforms:{facebook:4500,tiktok:5200,instagram:2800},topAd:'Wireless Earbuds Pro',avgCPM:'$8.20',avgCPC:'$0.31'},
  {competitor:'BeautyGlow',totalSpend:'$9.8K',daily:'$327',platforms:{facebook:2800,tiktok:4500,instagram:2500},topAd:'Heated Eyelash Curler',avgCPM:'$5.40',avgCPC:'$0.18'},
  {competitor:'FitGear Pro',totalSpend:'$5.1K',daily:'$170',platforms:{facebook:2200,tiktok:1800,instagram:1100},topAd:'Resistance Band Set',avgCPM:'$7.50',avgCPC:'$0.28'},
  {competitor:'HomeEssentials',totalSpend:'$11.3K',daily:'$377',platforms:{facebook:5100,tiktok:3900,instagram:2300},topAd:'Galaxy Projector',avgCPM:'$7.10',avgCPC:'$0.26'},
  {competitor:'Kawaii Corner',totalSpend:'$4.6K',daily:'$153',platforms:{facebook:800,tiktok:2800,instagram:1000},topAd:'Cactus Night Light',avgCPM:'$4.20',avgCPC:'$0.14'},
  {competitor:'ChargeTech Direct',totalSpend:'$7.8K',daily:'$260',platforms:{facebook:3500,tiktok:2800,instagram:1500},topAd:'Wireless Charger Pad',avgCPM:'$6.90',avgCPC:'$0.25'},
  {competitor:'EcoKitchen Co',totalSpend:'$5.5K',daily:'$183',platforms:{facebook:2200,tiktok:2000,instagram:1300},topAd:'Portable Blender',avgCPM:'$5.80',avgCPC:'$0.21'},
  {competitor:'PostureTech Wellness',totalSpend:'$6.9K',daily:'$230',platforms:{facebook:1800,tiktok:3500,instagram:1600},topAd:'Neck Posture Corrector',avgCPM:'$4.80',avgCPC:'$0.16'},
  {competitor:'StarLight Decor',totalSpend:'$8.7K',daily:'$290',platforms:{facebook:3800,tiktok:3100,instagram:1800},topAd:'LED Star Projector',avgCPM:'$5.60',avgCPC:'$0.19'}
];

// ===== SPY STORES (extended competitor data for spy-center) =====
var SpyStores = [
  {id:'s1',name:'PetLover Store',platform:'Shopify',url:'petlover.myshopify.com',revenue:48200,traffic:32400,convRate:3.2,ads:23,products:156,aov:38.50,refundRate:2.1,lastActive:'2 min ago',avatar:'P',color:'var(--accent-green)',category:'Pets',age:'14 months',theme:'Dawn 2.0',apps:['DSers','Loox Reviews','Klaviyo','Privy','Tidio'],trafficSources:{direct:22,organic:35,paid:28,social:12,referral:3},socialFB:12400,socialIG:8900,socialTK:15600,seoScore:72,pageSpeed:68,bounceRate:42,avgSession:'2:34'},
  {id:'s2',name:'TechGadget Hub',platform:'Shopify',url:'techgadget.myshopify.com',revenue:32100,traffic:21800,convRate:2.9,ads:18,products:89,aov:42.80,refundRate:3.4,lastActive:'5 min ago',avatar:'T',color:'var(--accent-cyan)',category:'Electronics',age:'8 months',theme:'Refresh',apps:['CJ Dropshipping','Judge.me','Omnisend','PageFly','ReConvert'],trafficSources:{direct:18,organic:28,paid:35,social:15,referral:4},socialFB:9800,socialIG:14200,socialTK:22100,seoScore:65,pageSpeed:74,bounceRate:38,avgSession:'3:12'},
  {id:'s3',name:'BeautyGlow',platform:'Shopify',url:'beautyglow.myshopify.com',revenue:28400,traffic:19200,convRate:3.5,ads:31,products:203,aov:31.20,refundRate:1.8,lastActive:'1 min ago',avatar:'B',color:'var(--accent-pink)',category:'Beauty',age:'22 months',theme:'Sense',apps:['Spocket','Yotpo','Klaviyo','Beacon','Vitals'],trafficSources:{direct:15,organic:22,paid:30,social:28,referral:5},socialFB:18200,socialIG:32400,socialTK:41200,seoScore:81,pageSpeed:62,bounceRate:35,avgSession:'3:45'},
  {id:'s4',name:'FitGear Pro',platform:'Shopify',url:'fitgearpro.myshopify.com',revenue:19600,traffic:14100,convRate:2.7,ads:12,products:67,aov:35.90,refundRate:2.8,lastActive:'8 min ago',avatar:'F',color:'var(--accent-orange)',category:'Fitness',age:'6 months',theme:'Dawn 2.0',apps:['Oberlo','Ali Reviews','SMSBump','Product Options','Trust Badge'],trafficSources:{direct:20,organic:32,paid:25,social:18,referral:5},socialFB:7600,socialIG:11800,socialTK:9400,seoScore:58,pageSpeed:71,bounceRate:44,avgSession:'2:08'},
  {id:'s5',name:'HomeEssentials',platform:'WooCommerce',url:'homeessentials.com',revenue:22300,traffic:16500,convRate:2.4,ads:15,products:134,aov:29.50,refundRate:3.1,lastActive:'12 min ago',avatar:'H',color:'var(--accent-purple)',category:'Home & Living',age:'18 months',theme:'flavor',apps:['WooCommerce Shipping','Mailchimp','WC Reviews','SiteKit','WP Rocket'],trafficSources:{direct:25,organic:38,paid:18,social:14,referral:5},socialFB:11200,socialIG:6800,socialTK:5200,seoScore:78,pageSpeed:82,bounceRate:48,avgSession:'1:52'},
  {id:'s6',name:'Kawaii Decor Co',platform:'Shopify',url:'kawaiidecor.myshopify.com',revenue:15800,traffic:11200,convRate:3.1,ads:9,products:92,aov:26.40,refundRate:1.5,lastActive:'3 min ago',avatar:'K',color:'var(--accent-yellow)',category:'Home Decor',age:'10 months',theme:'Craft',apps:['Printful','Loox Reviews','PushOwl','Bold Upsell','SEO Optimizer'],trafficSources:{direct:12,organic:30,paid:20,social:32,referral:6},socialFB:5400,socialIG:21600,socialTK:28900,seoScore:69,pageSpeed:76,bounceRate:31,avgSession:'3:28'},
  {id:'s7',name:'ChargeTech',platform:'Shopify',url:'chargetech.myshopify.com',revenue:27600,traffic:18900,convRate:2.8,ads:20,products:112,aov:44.20,refundRate:2.6,lastActive:'6 min ago',avatar:'C',color:'var(--accent-cyan)',category:'Electronics',age:'16 months',theme:'Dawn 2.0',apps:['DSers','Ali Reviews','Klaviyo','Privy','Lucky Orange'],trafficSources:{direct:19,organic:26,paid:33,social:17,referral:5},socialFB:8900,socialIG:12100,socialTK:18700,seoScore:61,pageSpeed:69,bounceRate:40,avgSession:'2:56'},
  {id:'s8',name:'EcoKitchen Pro',platform:'WooCommerce',url:'ecokitchenpro.com',revenue:18400,traffic:13200,convRate:2.6,ads:11,products:78,aov:33.80,refundRate:1.9,lastActive:'15 min ago',avatar:'E',color:'var(--accent-green)',category:'Kitchen',age:'20 months',theme:'flavor',apps:['WC Subscriptions','Mailchimp','TrustPulse','WC Stripe','MonsterInsights'],trafficSources:{direct:28,organic:40,paid:14,social:13,referral:5},socialFB:6200,socialIG:4800,socialTK:3100,seoScore:84,pageSpeed:88,bounceRate:36,avgSession:'2:42'},
  {id:'s9',name:'PostureTech',platform:'Shopify',url:'posturetech.myshopify.com',revenue:24100,traffic:17600,convRate:3.0,ads:16,products:45,aov:36.70,refundRate:2.2,lastActive:'4 min ago',avatar:'P',color:'var(--accent-red)',category:'Wellness',age:'11 months',theme:'Refresh',apps:['CJ Dropshipping','Judge.me','Omnisend','Bold Upsell','PageFly'],trafficSources:{direct:16,organic:29,paid:32,social:18,referral:5},socialFB:10100,socialIG:15800,socialTK:26400,seoScore:67,pageSpeed:73,bounceRate:37,avgSession:'3:05'},
  {id:'s10',name:'StarLight Tech',platform:'Shopify',url:'starlighttech.myshopify.com',revenue:35200,traffic:24100,convRate:3.3,ads:27,products:134,aov:40.60,refundRate:2.4,lastActive:'1 min ago',avatar:'S',color:'var(--accent-purple)',category:'Home Tech',age:'19 months',theme:'Dawn 2.0',apps:['DSers','Loox Reviews','Klaviyo','ReConvert','Vitals'],trafficSources:{direct:21,organic:31,paid:30,social:14,referral:4},socialFB:14800,socialIG:19200,socialTK:35800,seoScore:75,pageSpeed:66,bounceRate:39,avgSession:'2:48'}
];

// ===== MOCK API OBJECT =====
var MockAPI = {
  getProducts: function(filters) {
    var results = PRODUCTS.slice();
    if (filters) {
      if (filters.platform && filters.platform !== 'all') {
        results = results.filter(function(p) { return p.platform === filters.platform; });
      }
      if (filters.category) {
        results = results.filter(function(p) { return p.category === filters.category; });
      }
      if (filters.priceMax) {
        results = results.filter(function(p) { return p.price <= filters.priceMax; });
      }
      if (filters.minScore) {
        results = results.filter(function(p) { return p.score >= filters.minScore; });
      }
      if (filters.competition && filters.competition !== 'all') {
        results = results.filter(function(p) { return p.competition === filters.competition; });
      }
      if (filters.margin && filters.margin !== 'all') {
        results = results.filter(function(p) { return p.margin >= parseInt(filters.margin); });
      }
      if (filters.query) {
        var q = filters.query.toLowerCase();
        results = results.filter(function(p) {
          return p.title.toLowerCase().indexOf(q) !== -1
            || p.category.toLowerCase().indexOf(q) !== -1
            || p.keywords.some(function(k) { return k.toLowerCase().indexOf(q) !== -1; });
        });
      }
    }
    return results;
  },

  getProduct: function(id) {
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].id === id) return PRODUCTS[i];
    }
    return null;
  },

  getCompetitors: function() { return Competitors; },

  getLiveAds: function() { return LiveAds; },

  getPriceChanges: function() { return PriceChanges; },

  getAdSpend: function() { return AdSpendIntel; },

  getSuppliers: function(filters) {
    var results = SUPPLIERS.slice();
    if (filters) {
      if (filters.specialty) {
        results = results.filter(function(s) { return s.specialty.toLowerCase().indexOf(filters.specialty.toLowerCase()) !== -1; });
      }
      if (filters.verified) {
        results = results.filter(function(s) { return s.verified; });
      }
      if (filters.location) {
        results = results.filter(function(s) { return s.location.toLowerCase().indexOf(filters.location.toLowerCase()) !== -1; });
      }
    }
    return results;
  },

  getSupplier: function(id) {
    for (var i = 0; i < SUPPLIERS.length; i++) {
      if (SUPPLIERS[i].id === id) return SUPPLIERS[i];
    }
    return null;
  },

  getTrends: function(productId) {
    var p = MockAPI.getProduct(productId);
    if (!p) return { trendData: [], seasonality: [] };
    return { trendData: p.trendData, seasonality: p.seasonality };
  },

  getCategories: function() {
    return CATEGORIES.map(function(c) { return c.name; });
  },

  getPlatforms: function() { return PLATFORMS.slice(); },

  getSpyStores: function() { return SpyStores; },

  getProductCount: function() { return PRODUCTS.length; },

  fetch: function(endpoint, options) {
    var data = null;
    if (endpoint === '/api/products' || endpoint.indexOf('/api/products') === 0) {
      data = PRODUCTS;
    } else if (endpoint === '/api/competitors') {
      data = Competitors;
    } else if (endpoint === '/api/ads') {
      data = LiveAds;
    } else if (endpoint === '/api/price-changes') {
      data = PriceChanges;
    } else if (endpoint === '/api/ad-spend') {
      data = AdSpendIntel;
    } else if (endpoint === '/api/suppliers') {
      data = SUPPLIERS;
    } else if (endpoint === '/api/categories') {
      data = CATEGORIES.map(function(c) { return c.name; });
    } else {
      return Promise.reject(new Error('Unknown endpoint: ' + endpoint));
    }
    return delayed(JSON.parse(JSON.stringify(data)), 200, 800);
  },

  _raw: { products: PRODUCTS, competitors: Competitors, suppliers: SUPPLIERS, liveAds: LiveAds, priceChanges: PriceChanges, adSpend: AdSpendIntel, spyStores: SpyStores }
};

// ===== OVERRIDE FETCH FOR /api/* ROUTES =====
var _origFetch = window.fetch;
window.fetch = function(url, options) {
  if (typeof url === 'string' && url.indexOf('/api/') === 0) {
    return MockAPI.fetch(url, options);
  }
  if (_origFetch) return _origFetch.apply(window, arguments);
  return Promise.reject(new Error('No fetch available'));
};

// ===== EXPORT =====
window.MockAPI = MockAPI;

console.log('[MockAPI] Loaded ' + PRODUCTS.length + ' products, ' + Competitors.length + ' competitors, ' + SUPPLIERS.length + ' suppliers');
})();

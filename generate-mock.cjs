// generate-mock.js — Creates mock-api.js in chunks to avoid size limits
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, 'plugins', 'mock-api.js');

function chunk(arr, size) {
  const r = [];
  for (let i = 0; i < arr.length; i += size) r.push(arr.slice(i, i + size));
  return r;
}

function write(text) {
  fs.appendFileSync(out, text, 'utf8');
}

// Clear file
fs.writeFileSync(out, '', 'utf8');

// ---- Header ----
write(`(function(){
  function simulateLatency(min, max) {
    var delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(function(resolve){ setTimeout(resolve, delay); });
  }

  var PRODUCTS = [\n`);

// ---- Product Data ----
const ids = [];
for (let i = 1; i <= 200; i++) ids.push(i);

// Product templates by category
const categories = {
  'Electronics': {
    range: [1,30],
    titles: [
      'WiFi Range Extender Dual Band 300Mbps','USB-C Hub 7-in-1 Multiport Adapter','Wireless Ergonomic Mouse 2.4G Silent',
      'Bluetooth Earbuds TWS 5.3','Smart LED Light Strip 50ft RGB','Portable Phone Charger 20000mAh',
      'Webcam 1080p HD Auto Focus','USB Desk Fan Mini Portable','Wireless Keyboard Compact Low Profile',
      'Phone Stand Adjustable Aluminum','Laptop Cooling Pad 5 Fan','Screen Protector Tempered Glass Pack',
      'Smart Plug WiFi 4 Pack','Action Camera 4K Waterproof','Digital Kitchen Scale Precision',
      'LED Desk Lamp Touch Dimmable','Bluetooth Speaker Portable 10W','Magnetic Phone Mount Car',
      'Dash Cam Front and Rear','Smart Watch Fitness Tracker','Wireless Charging Pad 3 in 1',
      'HDMI Cable 4K 6ft 2 Pack','Power Strip Surge Protector USB','Ring Light 18 inch LED',
      'Smart Doorbell Camera WiFi','Pendant Light LED Chandelier','Portable Projector Mini HD',
      'Bluetooth Adapter USB Dongle','Smart Thermostat WiFi','Noise Cancelling Headphones Over Ear'
    ],
    basePrice: [8,16],
    margins: [72,78],
    score: [82,94],
    images: [
      'photo-1558618666-fcd25c85f82e','photo-1625842268584-8f3296236761','photo-1527864550417-7fd91fc51a46',
      'photo-1590658268037-6bf12f032f55','photo-1550009158-9ebf69173e03','photo-1609091839311-d5365f9ed1c5',
      'photo-1587825140708-dfaf18c4f2d4','photo-1585771724684-38269d6639fd','photo-1587829741301-dc798b83add3',
      'photo-1586953208448-b95a79798f07','photo-1593642632559-0c6d3fc62b89','photo-1621761191319-c6fb62004040',
      'photo-1558618666-fcd25c85f82e','photo-1526170375885-4d8ecf77b99f','photo-1589984662646-e7b2e4962f18',
      'photo-1507003211169-0a1dd7228f2d','photo-1608043152269-423dbba4e7e1','photo-1544244015-0df4b3ffc6b0',
      'photo-1617952739858-8c2a8a2a4f2a','photo-1579586337278-3befd40fd17a','photo-1625842268584-8f3296236761',
      'photo-1628815113969-0487917f72b7','photo-1555664424-778a1e5e1b48','photo-1543512214-318228f0f3b2',
      'photo-1585771724684-38269d6639fd','photo-1527864550417-7fd91fc51a46','photo-1588423771073-b890b7e654b1',
      'photo-1587825140708-dfaf18c4f2d4','photo-1558618666-fcd25c85f82e','photo-1589984662646-e7b2e4962f18'
    ]
  },
  'Home & Garden': {
    range: [31,55],
    titles: [
      'Succulent Planter Set Ceramic 3 Pack','LED Solar Garden Lights 10 Pack','Indoor Herb Garden Starter Kit',
      'Smart Watering System WiFi','Hanging Macrame Plant Holder','Bamboo Plant Shelf 3 Tier',
      'Garden Tool Set 5 Piece Stainless','Robot Vacuum Cleaner Smart','Air Purifier HEPA Filter Home',
      'Aroma Diffuser Ultrasonic Cool Mist','Electric Spin Scrubber Cordless','Stainless Steel Sprinkler Set',
      'Magnetic Screen Door Curtain','Patio Umbrella LED Solar 10ft','Greenhouse Mini Portable Walk In',
      'Cordless Handheld Vacuum Mini','LED Motion Sensor Light Indoor','Smart Irrigation Timer WiFi',
      'Garden Hose Expandable 100ft','Plant Grow Light Full Spectrum','Storage Basket Set Woven 3 Pack',
      'Automatic Pet Feeder WiFi','Door Lock Smart Deadbolt Keypad','Wall Art Canvas Print Set 3',
      'Floating Shelf Set Wall Mount 3'
    ],
    basePrice: [10,28],
    margins: [68,76],
    score: [80,90],
    images: [
      'photo-1485955900006-10f4d324d411','photo-1558618666-fcd25c85f82e','photo-1466692476868-aef1dfb1e735',
      'photo-1585320806297-9794b3e4eeae','photo-1520412099551-62b6bafeb5bb','photo-1545569341-9eb8b30979d9',
      'photo-1416879595882-3373a0480b5b','photo-1558618666-fcd25c85f82e','photo-1585771724684-38269d6639fd',
      'photo-1608571423902-eed4a5ad8108','photo-1585771724684-38269d6639fd','photo-1558618666-fcd25c85f82e',
      'photo-1558618666-fcd25c85f82e','photo-1533090161767-e6ffed986c88','photo-1585320806297-9794b3e4eeae',
      'photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e','photo-1585320806297-9794b3e4eeae',
      'photo-1558618666-fcd25c85f82e','photo-1533090161767-e6ffed986c88','photo-1558618666-fcd25c85f82e',
      'photo-1558618666-fcd25c85f82e','photo-1585771724684-38269d6639fd','photo-1513694203232-719a280e022f',
      'photo-1513694203232-719a280e022f'
    ]
  },
  'Health & Beauty': {
    range: [56,80],
    titles: [
      'Facial Jade Roller Set 4 Piece','Hair Straightener Brush Ceramic','Electric Toothbrush Sonic',
      'LED Face Mask Therapy 7 Color','Collagen Cream Anti Aging','Vitamin C Serum Organic',
      'Teeth Whitening Strips Kit','Scalp Massager Shampoo Brush','Hair Growth Oil Natural',
      'Derma Roller Microneedle 0.5mm','Eyelash Growth Serum','Facial Cleansing Brush Spin',
      'Retinol Night Cream Moisturizer','Electric Callus Remover Feet','Hair Dryer Diffuser Ionic',
      'Body Sculpting Massager Electric','Eyebrow Trimmer Rechargeable','Lip Plumper Serum Natural',
      'Foot Spa Massager Heat Bubble','Eye Cream Dark Circles Anti Fatigue','Nail Lamp UV LED Curing',
      'Hair Removal Cream Sensitive Skin','Facial Steamer Nano Ionic','Beard Trimmer Kit Cordless',
      'Stretch Mark Cream Natural'
    ],
    basePrice: [5,22],
    margins: [75,85],
    score: [78,92],
    images: [
      'photo-1596462502278-27bfdc403348','photo-1522335789203-aabd1fc54bc9','photo-1608248597279-f99d160bfcbc',
      'photo-1570172619644-dfd03ed5d881','photo-1611930022073-b7a4ba5fcccd','photo-1620916566398-39f1143ab7be',
      'photo-1556228578-0d85b1a4d571','photo-1556228578-0d85b1a4d571','photo-1598440947619-2c35fc9aa908',
      'photo-1616394584738-fc6e612e71b9','photo-1571781926291-c477ebfd024b','photo-1556228578-0d85b1a4d571',
      'photo-1611930022073-b7a4ba5fcccd','photo-1556228578-0d85b1a4d571','photo-1596462502278-27bfdc403348',
      'photo-1556228578-0d85b1a4d571','photo-1556228578-0d85b1a4d571','photo-1611930022073-b7a4ba5fcccd',
      'photo-1556228578-0d85b1a4d571','photo-1611930022073-b7a4ba5fcccd','photo-1556228578-0d85b1a4d571',
      'photo-1556228578-0d85b1a4d571','photo-1570172619644-dfd03ed5d881','photo-1596462502278-27bfdc403348',
      'photo-1611930022073-b7a4ba5fcccd'
    ]
  },
  'Pets': {
    range: [81,95],
    titles: [
      'Interactive Cat Toy Laser Pointer','Dog Harness No Pull Adjustable','Pet Water Fountain Stainless',
      'Cat Tree Tower Condo Scratcher','Dog Chew Toy Durable Rubber','GPS Pet Tracker Mini Lightweight',
      'Pet Hair Remover Roller','Automatic Laser Cat Toy','Dog Training Clicker Set',
      'Cat Litter Mat Trapping Waterproof','Pet Carrier Airline Approved','Dog Grooming Kit Electric',
      'Cat Scratching Post Sisal','Dog Bowl Elevated Adjustable','Pet Camera Treat Dispenser'
    ],
    basePrice: [8,30],
    margins: [70,80],
    score: [80,92],
    images: [
      'photo-1587300003388-59208cc962cb','photo-1560807707-8cc77767d783','photo-1608270586620-248524c67de9',
      'photo-1540555700478-4be289fbec6e','photo-1535930749574-1399327ce78f','photo-1558618666-fcd25c85f82e',
      'photo-1592194996308-7b43878e84a6','photo-1526336024174-e58f5cdd8e13','photo-1587300003388-59208cc962cb',
      'photo-1558618666-fcd25c85f82e','photo-1608270586620-248524c67de9','photo-1592194996308-7b43878e84a6',
      'photo-1587300003388-59208cc962cb','photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e'
    ]
  },
  'Automotive': {
    range: [96,115],
    titles: [
      'Car Vacuum Cleaner Cordless','Tire Pressure Monitor TPMS','LED Car Interior Light Kit',
      'Dash Cam 4K WiFi GPS','Car Phone Mount Magnetic','Seat Cover Full Set Universal',
      'Jump Starter Portable 2000A','Trunk Organizer Collapsible','Steering Wheel Cover Leather',
      'Car Air Freshener Diffuser','Wireless Backup Camera Kit','OBD2 Scanner Bluetooth',
      'Car Sun Shade Windshield','Roof Rack Cross Bars','Ceramic Coating Spray Hydrophobic',
      'Floor Mats All Weather Set','Car Door Edge Guard Tape','Portable Air Compressor Tire',
      'Bluetooth FM Transmitter','Car Cover Waterproof Outdoor'
    ],
    basePrice: [8,35],
    margins: [65,78],
    score: [78,90],
    images: [
      'photo-1507003211169-0a1dd7228f2d','photo-1558618666-fcd25c85f82e','photo-1549317661-bd32c8ce0abb',
      'photo-1617952739858-8c2a8a2a4f2a','photo-1544244015-0df4b3ffc6b0','photo-1558618666-fcd25c85f82e',
      'photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e',
      'photo-1558618666-fcd25c85f82e','photo-1617952739858-8c2a8a2a4f2a','photo-1558618666-fcd25c85f82e',
      'photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e',
      'photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e',
      'photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e'
    ]
  },
  'Fashion & Accessories': {
    range: [116,140],
    titles: [
      'Crossbody Bag Vegan Leather','Sunglasses Polarized UV400','Smart Ring Fitness Tracker',
      'Bamboo Watch Automatic','Silk Scarf Printed Floral','Leather Wallet RFID Blocking',
      'Minimalist Necklace Gold','Canvas Tote Bag Oversized','Hair Clips Pearl Set 12',
      'Phone Chain Strap Beaded','Belt Reversible Leather','Travel Jewelry Case Organizer',
      'Hair Claw Clips Acrylic 8 Pack','Aviator Sunglasses Gold Frame','Bracelet Set Stackable',
      'Money Clip Card Holder Slim','Earrings Hoop Set Gold 6 Pack','Watch Band Silicone Universal',
      'Sunglasses Case Hard Shell','Ring Light Phone Case','Woven Belt Elastic Casual',
      'Baseball Cap Embroidered Unisex','Scarf Cashmere Feel Winter','Keychain Leather Minimalist',
      'AirPods Case Silicone Cute'
    ],
    basePrice: [4,18],
    margins: [72,85],
    score: [75,88],
    images: [
      'photo-1548036328-c9fa89d128fa','photo-1572635196237-14b3f281503f','photo-1558618666-fcd25c85f82e',
      'photo-1524592094714-0f0654e20314','photo-1601924994987-69e26d50dc26','photo-1627123424574-724758594e93',
      'photo-1515562141589-67f0d93e6b50','photo-1544816155-12df9643f363','photo-1558618666-fcd25c85f82e',
      'photo-1558618666-fcd25c85f82e','photo-1627123424574-724758594e93','photo-1558618666-fcd25c85f82e',
      'photo-1558618666-fcd25c85f82e','photo-1572635196237-14b3f281503f','photo-1558618666-fcd25c85f82e',
      'photo-1627123424574-724758594e93','photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e',
      'photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e',
      'photo-1588850561407-ed78c334e67a','photo-1601924994987-69e26d50dc26','photo-1558618666-fcd25c85f82e',
      'photo-1558618666-fcd25c85f82e'
    ]
  },
  'Sports & Fitness': {
    range: [141,160],
    titles: [
      'Resistance Bands Set 5 Levels','Yoga Mat Extra Thick Non Slip','Jump Rope Speed Bearing',
      'Foam Roller Muscle Massage','Water Bottle Insulated 32oz','Gym Bag Duffel Waterproof',
      'Pull Up Assist Band Set','Ab Roller Wheel Core Trainer','Kettlebell Adjustable Weight',
      'Balance Board Wooden Wobble','Swim Goggles Anti Fog','Boxing Hand Wraps 180 inch',
      'Massage Gun Portable Electric','Running Belt Phone Holder','Cycling Gloves Half Finger',
      'Hiking Socks Merino Wool 3 Pack','Climbing Chalk Bag','Lacrosse Ball Trigger Point',
      'Resistance Tube Set with Handles','Exercise Ball Stability 65cm'
    ],
    basePrice: [6,25],
    margins: [68,82],
    score: [78,91],
    images: [
      'photo-1571019614242-c5c5dee9f50b','photo-1601925260368-ae2f83cf8b7f','photo-1558618666-fcd25c85f82e',
      'photo-1571019614242-c5c5dee9f50b','photo-1523362628745-0c100fc988a6','photo-1558618666-fcd25c85f82e',
      'photo-1571019614242-c5c5dee9f50b','photo-1571019614242-c5c5dee9f50b','photo-1558618666-fcd25c85f82e',
      'photo-1571019614242-c5c5dee9f50b','photo-1558618666-fcd25c85f82e','photo-1571019614242-c5c5dee9f50b',
      'photo-1571019614242-c5c5dee9f50b','photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e',
      'photo-1571019614242-c5c5dee9f50b','photo-1558618666-fcd25c85f82e','photo-1571019614242-c5c5dee9f50b',
      'photo-1571019614242-c5c5dee9f50b','photo-1571019614242-c5c5dee9f50b'
    ]
  },
  'Toys & Games': {
    range: [161,175],
    titles: [
      'Fidget Cube Sensory Toy','Building Blocks 1000 Piece','RC Car Off Road 4WD',
      'Magnetic Tiles 120 Set','Puzzle 3D Wooden Mechanical','LED Drone Mini Foldable',
      'STEM Robot Programming','Board Game Strategy Family','Slime Kit DIY 12 Colors',
      'Water Gun Super Soaker Pack','Remote Control Dinosaur','Magic Trick Set 100 Pieces',
      'Balance Game Stacking Tower','Play Dough Tool Set 35 Piece','Card Game Party Ultimate'
    ],
    basePrice: [5,20],
    margins: [70,82],
    score: [76,90],
    images: [
      'photo-1558618666-fcd25c85f82e','photo-1587654780291-39c9404d7dd0','photo-1558618666-fcd25c85f82e',
      'photo-1587654780291-39c9404d7dd0','photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e',
      'photo-1558618666-fcd25c85f82e','photo-1587654780291-39c9404d7dd0','photo-1558618666-fcd25c85f82e',
      'photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e',
      'photo-1587654780291-39c9404d7dd0','photo-1558618666-fcd25c85f82e','photo-1587654780291-39c9404d7dd0'
    ]
  },
  'Kitchen & Dining': {
    range: [176,190],
    titles: [
      'Air Fryer Compact 4.5L Digital','Instant Read Thermometer Digital','Silicone Utensil Set 12 Piece',
      'Cold Brew Coffee Maker Glass','Electric Kettle Gooseneck Temp Control','Knife Set 6 Piece Block',
      'Cutting Board Bamboo 3 Pack','French Press Coffee 34oz','Immersion Blender Handheld',
      'Spice Rack Set 20 Jars','Food Storage Containers 10 Set','Garlic Press Stainless',
      'Milk Frother Electric Handheld','Nonstick Pan Set 3 Piece','Herb Scissors 5 Blade'
    ],
    basePrice: [8,32],
    margins: [68,80],
    score: [80,93],
    images: [
      'photo-1556909114-f6e7ad7d3136','photo-1556909114-f6e7ad7d3136','photo-1558618666-fcd25c85f82e',
      'photo-1556909114-f6e7ad7d3136','photo-1556909114-f6e7ad7d3136','photo-1558618666-fcd25c85f82e',
      'photo-1558618666-fcd25c85f82e','photo-1556909114-f6e7ad7d3136','photo-1556909114-f6e7ad7d3136',
      'photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e',
      'photo-1556909114-f6e7ad7d3136','photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e'
    ]
  },
  'Office & Stationery': {
    range: [191,195],
    titles: [
      'Desk Organizer Mesh Metal','Whiteboard Magnetic Dry Erase','Sticky Notes Set 12 Pack',
      'Paper Shredder Cross Cut','Monitor Stand Riser Wood'
    ],
    basePrice: [8,22],
    margins: [65,78],
    score: [75,88],
    images: [
      'photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e',
      'photo-1558618666-fcd25c85f82e','photo-1558618666-fcd25c85f82e'
    ]
  },
  'Outdoor & Camping': {
    range: [196,200],
    titles: [
      'Camping Hammock with Mosquito Net','Solar Charger Panel 28W','LED Lantern Rechargeable',
      'Sleeping Bag Compact Lightweight','Camping Stove Portable Gas'
    ],
    basePrice: [12,28],
    margins: [65,78],
    score: [78,90],
    images: [
      'photo-1504280390367-361c6d9f38f4','photo-1558618666-fcd25c85f82e','photo-1504280390367-361c6d9f38f4',
      'photo-1558618666-fcd25c85f82e','photo-1504280390367-361c6d9f38f4'
    ]
  }
};

const platforms = ['aliexpress','amazon','shopify','ebay','temu','tiktok','etsy','cjdropshipping','dhgate','wish'];
const shipFroms = ['China','Shenzhen, CN','Guangzhou, CN','Yiwu, CN','Dongguan, CN','Fujian, CN','Zhejiang, CN','China Warehouse','US Warehouse'];
const competitionLevels = ['low','medium','high','very high'];
const badgeSets = [
  ['trending'],['winning'],['hot'],['trending','hot'],['ai'],
  ['trending','ai'],['winning','hot'],['new'],['limited'],['bestseller'],
  ['trending','winning'],['hot','ai'],['premium'],['staff pick'],['editor choice'],
  ['trending','premium'],['winning','ai'],['new','hot'],['limited','trending'],['bestseller','hot']
];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randf(min, max) { return +(Math.random() * (max - min) + min).toFixed(2); }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }

// Generate platformPrices
function genPlatformPrices(base) {
  return {
    aliexpress: +(base * (1 + randf(0, 0.05))).toFixed(2),
    amazon: +(base * (2 + randf(0.5, 2))).toFixed(2),
    shopify: +(base * (2.5 + randf(0.5, 2.5))).toFixed(2),
    ebay: +(base * (1.8 + randf(0.2, 1.5))).toFixed(2),
    temu: +(base * (0.9 + randf(0, 0.1))).toFixed(2),
    tiktok: +(base * (1.5 + randf(0.5, 1.5))).toFixed(2),
    etsy: +(base * (2 + randf(0.5, 2))).toFixed(2),
    cjdropshipping: +(base * (1.1 + randf(0.05, 0.15))).toFixed(2),
    dhgate: +(base * (0.95 + randf(0, 0.05))).toFixed(2),
    wish: +(base * (0.9 + randf(0, 0.1))).toFixed(2)
  };
}

function genTrendData() {
  const base = rand(40, 70);
  return Array.from({length:12}, (_, i) => Math.min(120, Math.max(10, base + rand(-15, 25) + (i > 6 ? 10 : 0))));
}

function genSeasonality() {
  const base = rand(70, 100);
  return Array.from({length:12}, () => Math.min(140, Math.max(50, base + rand(-20, 30))));
}

const allProducts = [];
for (const cat of Object.values(categories)) {
  const [start, end] = cat.range;
  for (let i = start; i <= end; i++) {
    const idx = i - start;
    const base = rand(cat.basePrice[0], cat.basePrice[1]);
    const margin = rand(cat.margins[0], cat.margins[1]);
    const platform = pick(platforms);
    const imgIdx = idx % cat.images.length;
    allProducts.push({
      id: i,
      title: cat.titles[idx],
      image: `https://images.unsplash.com/${cat.images[imgIdx]}?w=400&h=400&fit=crop`,
      platform,
      price: +(base * (1 + randf(0, 0.1))).toFixed(2),
      originalPrice: +(base * (3 + randf(0.5, 2.5))).toFixed(2),
      margin,
      score: rand(cat.score[0], cat.score[1]),
      badges: pick(badgeSets),
      salesVelocity: rand(800, 6000),
      competition: pick(competitionLevels),
      demand: rand(55, 95),
      rating: randf(3.8, 4.9),
      reviews: rand(50, 28000),
      orders: `${rand(1, 300)}K`,
      shipFrom: pick(shipFroms),
      category: cat.titles === categories['Electronics'].titles ? 'Electronics' :
                cat.titles === categories['Home & Garden'].titles ? 'Home & Garden' :
                cat.titles === categories['Health & Beauty'].titles ? 'Health & Beauty' :
                cat.titles === categories['Pets'].titles ? 'Pets' :
                cat.titles === categories['Automotive'].titles ? 'Automotive' :
                cat.titles === categories['Fashion & Accessories'].titles ? 'Fashion & Accessories' :
                cat.titles === categories['Sports & Fitness'].titles ? 'Sports & Fitness' :
                cat.titles === categories['Toys & Games'].titles ? 'Toys & Games' :
                cat.titles === categories['Kitchen & Dining'].titles ? 'Kitchen & Dining' :
                cat.titles === categories['Office & Stationery'].titles ? 'Office & Stationery' : 'Outdoor & Camping',
      keywords: cat.titles[idx].toLowerCase().split(' ').slice(0, 4),
      suppliers: [{ name: `Supplier ${rand(100,999)}`, location: pick(shipFroms), rating: randf(4.2, 4.9), orders: `${rand(10,300)}K`, responseTime: `< ${rand(1,8)}h`, verified: Math.random() > 0.3 }],
      platformPrices: genPlatformPrices(base),
      trendData: genTrendData(),
      seasonality: genSeasonality(),
      audience: { age: pick(['18-24','25-34','25-44','35-54','18-34','22-40']), gender: pick(['All','Male','Female']), interests: [pick(['tech','fitness','home','fashion','beauty','outdoors']), pick(['gadgets','wellness','decor','trends','value'])], countries: pick([['US','UK','CA'],['US','UK','DE','AU'],['US','IN','BR'],['US','CA','UK','AU'],['US','UK','FR','DE']]) },
      riskScore: rand(10, 65),
      marketSaturation: rand(25, 85),
      adSpendAvg: randf(0.3, 2.5),
      cpaAvg: randf(2, 12),
      aiInsight: pick(['Strong performer with consistent demand. Good margin potential.','Trending product with increasing search volume.','Saturated market but differentiated positioning possible.','High volume commodity - compete on price and speed.','Niche product with loyal customer base.','Seasonal peaks make timing critical.','Low competition, high margin opportunity.','Premium pricing viable with strong branding.','Volume play - margins thin but turnover fast.','Emerging trend with first-mover advantage.'])
    });
  }
}

// Write products in chunks
const productChunks = chunk(allProducts, 8);
for (const chunkArr of productChunks) {
  for (let i = 0; i < chunkArr.length; i++) {
    const p = chunkArr[i];
    const comma = (p.id < 200) ? ',' : '';
    write(`    {id:${p.id},title:"${p.title.replace(/"/g, '\\"')}",image:"${p.image}",platform:"${p.platform}",price:${p.price},originalPrice:${p.originalPrice},margin:${p.margin},score:${p.score},badges:[${p.badges.map(b=>`"${b}"`).join(',')}],salesVelocity:${p.salesVelocity},competition:"${p.competition}",demand:${p.demand},rating:${p.rating},reviews:${p.reviews},orders:"${p.orders}",shipFrom:"${p.shipFrom}",category:"${p.category}",keywords:[${p.keywords.map(k=>`"${k}"`).join(',')}],suppliers:[{name:"${p.suppliers[0].name}",location:"${p.suppliers[0].location}",rating:${p.suppliers[0].rating},orders:"${p.suppliers[0].orders}",responseTime:"${p.suppliers[0].responseTime}",verified:${p.suppliers[0].verified}}],platformPrices:{aliexpress:${p.platformPrices.aliexpress},amazon:${p.platformPrices.amazon},shopify:${p.platformPrices.shopify},ebay:${p.platformPrices.ebay},temu:${p.platformPrices.temu},tiktok:${p.platformPrices.tiktok},etsy:${p.platformPrices.etsy},cjdropshipping:${p.platformPrices.cjdropshipping},dhgate:${p.platformPrices.dhgate},wish:${p.platformPrices.wish}},trendData:[${p.trendData.join(',')}],seasonality:[${p.seasonality.join(',')}],audience:{age:"${p.audience.age}",gender:"${p.audience.gender}",interests:[${p.audience.interests.map(k=>`"${k}"`).join(',')}],countries:[${p.audience.countries.map(k=>`"${k}"`).join(',')}]}},riskScore:${p.riskScore},marketSaturation:${p.marketSaturation},adSpendAvg:${p.adSpendAvg},cpaAvg:${p.cpaAvg},aiInsight:"${p.aiInsight.replace(/"/g, '\\"')}"}${comma}\n`);
  }
}

// ---- Close products array, add other data ----
write(`  ];

  var SUPPLIERS = [\n`);

// ---- SUPPLIERS ----
const supplierNames = [
  'ShenZhen TechFlow','DongGuan SmartParts','Yiwu DigitalTech','Guangzhou TradeHub','Fujian StarSupply',
  'Zhejiang BrightGoods','Shanghai SmartMfg','Ningbo QualityFirst','Shenzhen RapidShip','Guangdong FastMold',
  'Dongguan QuickTurn','Xiamen PrimeSource','Wenzhou ValueFactory','Taizhou ReliableParts','Foshan PrimeMold',
  'Hangzhou TrendSource','Wuhan TechParts','Suzhou PrecisionCo','Chengdu InnovateTech','Jinhua TradeLink',
  'Linyi ExportHub','Cangzhou SteelWorks','Quanzhou SportGear','Putian ShoeFactory','Jieyang PlasticMold',
  'Shantou ToyWorld','Zhongshan LightCo','Jiangmen HomeGoods','Zhuhai ElectronicsCo','Huizhou PartsDirect',
  'Heyuan CeramicArt','Maoming AgriSupply','Zhanjiang RubberCo','Yangjiang BladeWorks','Shaoguan MetalFab',
  'Qingdao OceanTrade','Yantai FruitExport','Weifang AgriParts','Rizhao SeafoodCo','TaiAn LeatherCraft',
  'Zaozhuang ChemicalCo','Linyi WoodProducts','Dezhou SolarTech','Binzhou CottonMill','Liaocheng PipeWorks',
  'Heze PeonyExport','Jining MachineryCo','Xintai MiningParts','Taiqian RefractoryCo','Dongying PetroChem',
  'Puyang RubberParts','Kaifeng CeramicCo','Xinyang MaoFur','Nanyang JadeCraft','Sanmenxia GlassCo'
];

for (let i = 0; i < supplierNames.length; i++) {
  const s = supplierNames[i];
  const comma = i < supplierNames.length - 1 ? ',' : '';
  write(`    {id:${i+1},name:"${s}",location:"${pick(['Shenzhen, CN','Guangzhou, CN','Yiwu, CN','Dongguan, CN','Fujian, CN','Zhejiang, CN','Shanghai, CN','Ningbo, CN','Xiamen, CN','Qingdao, CN'])}",rating:${randf(4.0, 4.9)},orders:"${rand(10,500)}K",responseTime:"< ${rand(1,12)}h",verified:${Math.random()>0.25},products:${rand(50,500)},years:${rand(2,15)},specialties:[${[pick(['Electronics','Plastic','Metal','Fabric','Ceramic']),pick(['LED','Mold','Textile','Parts','Gifts'])].map(s=>`"${s}"`).join(',')}],certifications:[${[pick(['ISO9001','CE','FCC','ROHS','SGS'])].map(s=>`"${s}"`).join(',')}]}${comma}\n`);
}

write(`  ];

  var COMPETITORS = [\n`);

const competitorStores = [
  'TechGear Hub','HomeEssentials Co','BeautyPure Store','PetParadise Shop','AutoParts Direct',
  'StyleVibe','FitGear Pro','ToyWorld','KitchenKing','OfficeSmart',
  'CampOut Supply','BabyJoy','GadgetZone'
];

for (let i = 0; i < competitorStores.length; i++) {
  const c = competitorStores[i];
  const comma = i < competitorStores.length - 1 ? ',' : '';
  write(`    {id:${i+1},name:"${c}",url:"${c.toLowerCase().replace(/\s+/g,'')}.myshopify.com",platform:"shopify",monthlyRevenue:"$${rand(15,350)}K",monthlyOrders:"${rand(800,15000)}",avgOrderValue:"$${randf(25,85)}",topProducts:${rand(5,15)},adSpend:"$${rand(5,50)}K/mo",techStack:${JSON.stringify(pick([['Shopify','Oberlo','Facebook Pixel','Klaviyo'],['WooCommerce','AliDropship','Google Analytics','Mailchimp'],['Shopify','DSers','TikTok Pixel','ConvertFlow'],['BigCommerce','Printful','Hotjar','Privy']]))},socialFollowing:{facebook:"${rand(5,200)}K",instagram:"${rand(10,500)}K",tiktok:"${rand(0,800)}K"},traffic:"${rand(20,300)}K/mo",conversionRate:${randf(1.2,4.5)},riskLevel:"${pick(['low','medium','high'])}"}${comma}\n`);
}

write(`  ];

  var COMPETITOR_ADS = [\n`);

const adTitles = [
  'Stop wasting money on bad WiFi','The only USB hub you need','Why 50K+ people switched','Game changer for home office',
  'Vet approved pet solution','Beauty secret dermatologists love','Upgrade your drive today','Kids love it parents approve',
  'Kitchen hack you never knew','Work from home essential','Adventure awaits be prepared','Baby safe 100% natural',
  'Gadget that went viral','Smart home made simple','Fitness gear that lasts','Self care Sunday essential',
  'Travel must have 2026','Pet parent must have','Cook like a pro','Desk setup upgrade'
];

for (let i = 0; i < 15; i++) {
  const comma = i < 14 ? ',' : '';
  write(`    {id:${i+1},competitorId:${rand(1,10)},platform:"${pick(['facebook','tiktok','instagram','google'])}",adType:"${pick(['video','image','carousel'])}",title:"${adTitles[i].replace(/"/g, '\\"')}",impressions:"${rand(10,500)}K",clicks:"${rand(1,30)}K",ctr:${randf(1.0,5.5)},conversions:${rand(50,2000)},spend:"$${rand(500,8000)}",cpa:"$${randf(3,15)}",startDate:"2026-${String(rand(1,6)).padStart(2,'0')}-${String(rand(1,28)).padStart(2,'0')}",creative:{headline:"${adTitles[i].replace(/"/g, '\\"')}",body:"Limited time offer. Free shipping worldwide.",cta:"Shop Now"},status:"${pick(['active','paused','ended'])}"}${comma}\n`);
}

write(`  ];

  var PRICE_CHANGES = [\n`);

for (let i = 1; i <= 10; i++) {
  const comma = i < 10 ? ',' : '';
  write(`    {id:${i},productId:${rand(1,200)},platform:"${pick(platforms)}",oldPrice:${randf(10,60)},newPrice:${randf(8,55)},change:${rand(-30,30)},date:"2026-${String(rand(1,6)).padStart(2,'0')}-${String(rand(1,28)).padStart(2,'0')}",reason:"${pick(['supplier cost','competition','seasonal','flash sale','clearance'])}"}${comma}\n`);
}

write(`  ];

  var NEW_PRODUCTS = [\n`);

const newProdTitles = ['Mini Projector 4K Portable','Smart Mirror LED Bathroom','Heated Vest USB Rechargeable','Portable Espresso Maker','UV Sanitizer Box Phone','Smart Water Bottle LED','Wireless Earbuds Gaming Low Latency','Electric Scooter Foldable'];

for (let i = 0; i < newProdTitles.length; i++) {
  const comma = i < newProdTitles.length - 1 ? ',' : '';
  write(`    {id:${i+1},title:"${newProdTitles[i]}",platform:"${pick(platforms)}",price:${randf(15,80)},launchDate:"2026-${String(rand(4,7)).padStart(2,'0')}-${String(rand(1,28)).padStart(2,'0')}",initialSales:${rand(100,3000)},growthRate:"${randf(5,45)}%",potentialScore:${rand(75,98)}}${comma}\n`);
}

write(`  ];

  var AD_SPEND = [\n`);

for (let i = 1; i <= 8; i++) {
  const comma = i < 8 ? ',' : '';
  write(`    {id:${i},productId:${rand(1,200)},platform:"${pick(['facebook','tiktok','instagram','google'])}",weeklySpend:"$${rand(100,3000)}",monthlySpend:"$${rand(500,12000)}",impressions:"${rand(50,500)}K",clicks:"${rand(1,20)}K",conversions:${rand(20,1000)},roas:${randf(2.0,8.0)},cpa:"$${randf(3,18)}",status:"${pick(['active','paused','optimized'])}"}${comma}\n`);
}

write(`  ];

  var SWOT = [\n`);

const swotProducts = ['WiFi Range Extender','USB-C Hub','Wireless Mouse','Jade Roller','Cat Tree','Car Vacuum','Crossbody Bag','Resistance Bands','Fidget Cube','Air Fryer','Desk Organizer','Camping Hammock','GPS Pet Tracker','Dash Cam','LED Face Mask'];

for (let i = 0; i < swotProducts.length; i++) {
  const comma = i < swotProducts.length - 1 ? ',' : '';
  write(`    {id:${i+1},product:"${swotProducts[i]}",strengths:${JSON.stringify(pick([['High margin','Low competition','Fast shipping'],['Brand loyalty','Quality material','Unique design'],['Trending','Social proof','Viral potential'],['Low cost','High volume','Repeat purchase'],['Eco-friendly','Premium feel','Gift-worthy']]))},weaknesses:${JSON.stringify(pick([['Long shipping','Low margin','High competition'],['Seasonal demand','Fragile','Hard to source'],['Price war','Copycats','Ad fatigue'],['Market saturated','Low reviews','No brand'],['Complex setup','Niche market','Regulations']]))},opportunities:${JSON.stringify(pick([['Expand to bundles','Seasonal push','Influencer collab'],['Private label','Bundle offers','Loyalty program'],['New markets','Bulk pricing','Subscription'],['Bundle upsell','Gift packaging','Corporate sales'],['Social ads','Affiliate push','Content marketing']]))},threats:${JSON.stringify(pick([['Supplier issues','Platform fees','Ad costs'],['New entrants','Platform ban','Legal issues'],['Market shift','Cost increase','Negative reviews'],['Copycats','Price drops','Trend fade'],['Supply chain','Regulation','Competition']]))}}${comma}\n`);
}

write(`  ];

  var WEEKLY_REVENUE = [\n`);

for (let i = 1; i <= 4; i++) {
  const comma = i < 4 ? ',' : '';
  write(`    {week:"Week ${i}",revenue:"$${rand(8000,45000)}",orders:${rand(200,1500)},aov:"$${randf(28,75)}",conversions:${randf(1.5,4.5)},traffic:"${rand(5000,40000)}"}${comma}\n`);
}

write(`  ];

  var PRICE_MATRIX = [\n`);

const matrixProducts = ['WiFi Extender','USB-C Hub','Wireless Mouse','Jade Roller','Pet Fountain'];

for (let i = 0; i < matrixProducts.length; i++) {
  const comma = i < matrixProducts.length - 1 ? ',' : '';
  const base = randf(8, 25);
  write(`    {id:${i+1},product:"${matrixProducts[i]}",prices:{aliexpress:${+(base).toFixed(2)},amazon:${+(base*2.5).toFixed(2)},shopify:${+(base*3).toFixed(2)},ebay:${+(base*2).toFixed(2)},temu:${+(base*0.95).toFixed(2)},tiktok:${+(base*1.8).toFixed(2)},etsy:${+(base*2.8).toFixed(2)},cjdropshipping:${+(base*1.1).toFixed(2)},dhgate:${+(base*0.9).toFixed(2)},wish:${+(base*0.85).toFixed(2)}},bestPlatform:"${pick(['aliexpress','temu','dhgate'])}",worstPlatform:"${pick(['shopify','etsy','amazon'])}",spread:${randf(5,25)}}${comma}\n`);
}

write(`  ];

  var NICHES = [\n`);

const nicheData = [
  {name:'Smart Home Gadgets',size:'$45B',growth:'+18%',competition:'high',opportunity:82,keywords:['smart home','iot','home automation','smart devices']},
  {name:'Sustainable Living',size:'$12B',growth:'+32%',competition:'medium',opportunity:88,keywords:['eco friendly','sustainable','green living','zero waste']},
  {name:'Pet Tech',size:'$8B',growth:'+25%',competition:'medium',opportunity:85,keywords:['pet gadgets','smart pet','pet tracker','pet camera']},
  {name:'Home Fitness',size:'$15B',growth:'+22%',competition:'high',opportunity:78,keywords:['home gym','fitness gear','workout','exercise']},
  {name:'Beauty Tech',size:'$6B',growth:'+28%',competition:'medium',opportunity:84,keywords:['beauty device','skincare tech','led mask','facial tool']},
  {name:'Outdoor Adventure',size:'$20B',growth:'+15%',competition:'medium',opportunity:80,keywords:['camping','hiking','outdoor gear','adventure']},
  {name:'Remote Work Setup',size:'$10B',growth:'+35%',competition:'high',opportunity:76,keywords:['home office','desk setup','ergonomic','work from home']},
  {name:'Baby & Toddler',size:'$18B',growth:'+12%',competition:'high',opportunity:72,keywords:['baby products','toddler','infant care','nursery']},
  {name:'Kitchen Innovation',size:'$9B',growth:'+20%',competition:'medium',opportunity:81,keywords:['kitchen gadget','cooking tools','air fryer','smart kitchen']},
  {name:'Travel Accessories',size:'$7B',growth:'+16%',competition:'medium',opportunity:79,keywords:['travel gear','luggage','travel organizer','packing']},
  {name:'Mental Wellness',size:'$5B',growth:'+40%',competition:'low',opportunity:92,keywords:['meditation','stress relief','mindfulness','wellness']},
  {name:'Aquarium & Fishkeeping',size:'$4B',growth:'+14%',competition:'low',opportunity:87,keywords:['aquarium','fish tank','aquatic','underwater']}
];

for (let i = 0; i < nicheData.length; i++) {
  const n = nicheData[i];
  const comma = i < nicheData.length - 1 ? ',' : '';
  write(`    {id:${i+1},name:"${n.name}",marketSize:"${n.size}",growth:"${n.growth}",competition:"${n.competition}",opportunityScore:${n.opportunity},keywords:[${n.keywords.map(k=>`"${k}"`).join(',')}],topProducts:${rand(5,15)},avgMargin:${rand(65,85)},trendDirection:"${pick(['rising','stable','explosive'])}"}${comma}\n`);
}

write(`  ];

  var SEASONAL_PEAKS = [\n`);

const seasonalCategories = ['Electronics','Home & Garden','Health & Beauty','Pets','Automotive','Fashion','Fitness','Toys','Kitchen','Office','Outdoor','Baby'];
const peakMonths = ['January','February','March','April','May','June','July','August','September','October','November','December'];

for (let i = 0; i < seasonalCategories.length; i++) {
  const comma = i < seasonalCategories.length - 1 ? ',' : '';
  write(`    {id:${i+1},category:"${seasonalCategories[i]}",peakMonth:"${peakMonths[i]}",peakIndex:${rand(110,150)},lowMonth:"${peakMonths[(i+5)%12]}",lowIndex:${rand(50,80)},annualVariation:${randf(15,45)}%,topKeywords:[${[pick(['best','sale','trending','popular']),pick(['2026','gift','deal','premium'])].map(k=>`"${k}"`).join(',')}]}${comma}\n`);
}

write(`  ];

  var TRENDING_NOW = [\n`);

const trendingData = [
  {name:'AI Pet Camera',category:'Pets',growth:'+180%',mentions:25000,sentiment:88,platforms:['TikTok','Instagram','YouTube']},
  {name:'Portable Ice Bath',category:'Fitness',growth:'+95%',mentions:15000,sentiment:82,platforms:['TikTok','YouTube','Twitter']},
  {name:'Smart Garden Kit',category:'Home',growth:'+120%',mentions:18000,sentiment:85,platforms:['Instagram','Pinterest','TikTok']},
  {name:'Heated Eyelash Curler',category:'Beauty',growth:'+210%',mentions:30000,sentiment:90,platforms:['TikTok','Instagram','YouTube']},
  {name:'Mini Projector 4K',category:'Electronics',growth:'+75%',mentions:22000,sentiment:84,platforms:['YouTube','TikTok','Reddit']}
];

for (let i = 0; i < trendingData.length; i++) {
  const t = trendingData[i];
  const comma = i < trendingData.length - 1 ? ',' : '';
  write(`    {id:${i+1},name:"${t.name}",category:"${t.category}",growth:"${t.growth}",mentions:${t.mentions},sentiment:${t.sentiment},platforms:[${t.platforms.map(p=>`"${p}"`).join(',')}],predictedPeak:"2026-${String(rand(7,12)).padStart(2,'0')}",riskScore:${rand(15,55)}}${comma}\n`);
}

write(`  ];

  var SPY_STORES = [\n`);

const spyStores = [
  'TechVibe','HomeHaven','BeautyBoss','PetPalace','AutoElite',
  'StyleMaven','FitZone','ToyLand','KitchenPro','OfficeEdge'
];

for (let i = 0; i < spyStores.length; i++) {
  const s = spyStores[i];
  const comma = i < spyStores.length - 1 ? ',' : '';
  write(`    {id:${i+1},name:"${s}",url:"${s.toLowerCase()}.com",platform:"${pick(['shopify','woocommerce','bigcommerce'])}",monthlyTraffic:"${rand(10,300)}K",monthlyRevenue:"$${rand(20,400)}K",topCategories:${JSON.stringify(pick([['Electronics','Home'],['Beauty','Fashion'],['Pets','Auto'],['Fitness','Kitchen'],['Toys','Office']]))},adStrategy:"${pick(['Facebook first','TikTok heavy','Google dominant','Multi-channel','Influencer focus'])}",techStack:${JSON.stringify(pick([['Shopify','Klaviyo','Facebook Pixel'],['WooCommerce','Mailchimp','Google Analytics'],['BigCommerce','Privy','Hotjar']]))},socialPresence:{facebook:"${rand(5,150)}K",instagram:"${rand(10,300)}K",tiktok:"${rand(0,500)}K"},estimatedConversion:${randf(1.5,4.0)}%}${comma}\n`);
}

write(`  ];

  var SPY_ADS = [\n`);

const spyAdTitles = [
  'Your setup is incomplete','Upgrade your morning routine','The pet camera that changed everything','Drive smarter not harder',
  'Fashion meets function','Home gym under $100','Educational and fun','Cook 10x faster','Desk envy starts here','Adventure ready gear',
  'Baby safe certified','Beauty device going viral'
];

for (let i = 0; i < spyAdTitles.length; i++) {
  const comma = i < spyAdTitles.length - 1 ? ',' : '';
  write(`    {id:${i+1},storeId:${rand(1,10)},platform:"${pick(['facebook','tiktok','instagram','google'])}",type:"${pick(['video','image','carousel','story'])}",title:"${spyAdTitles[i].replace(/"/g, '\\"')}",creativeUrl:"https://picsum.photos/seed/ad${i+1}/400/400",impressions:"${rand(20,800)}K",engagement:${randf(2.0,8.0)}%,conversions:${rand(30,3000)},spend:"$${rand(500,10000)}",status:"${pick(['active','ended'])}",firstSeen:"2026-${String(rand(1,6)).padStart(2,'0')}-${String(rand(1,28)).padStart(2,'0')}"}${comma}\n`);
}

write(`  ];

  // ---- Export ----
  window.HuntDrop = window.HuntDrop || {};
  window.HuntDrop.MockAPI = {
    PRODUCTS: PRODUCTS,
    SUPPLIERS: SUPPLIERS,
    COMPETITORS: COMPETITORS,
    COMPETITOR_ADS: COMPETITOR_ADS,
    PRICE_CHANGES: PRICE_CHANGES,
    NEW_PRODUCTS: NEW_PRODUCTS,
    AD_SPEND: AD_SPEND,
    SWOT: SWOT,
    WEEKLY_REVENUE: WEEKLY_REVENUE,
    PRICE_MATRIX: PRICE_MATRIX,
    NICHES: NICHES,
    SEASONAL_PEAKS: SEASONAL_PEAKS,
    TRENDING_NOW: TRENDING_NOW,
    SPY_STORES: SPY_STORES,
    SPY_ADS: SPY_ADS,
    getProducts: function(filters) { return simulateLatency(100, 500).then(function() { return PRODUCTS; }); },
    getProduct: function(id) { return simulateLatency(50, 200).then(function() { return PRODUCTS.find(function(p) { return p.id === id; }); }); },
    searchProducts: function(q) { return simulateLatency(100, 400).then(function() { var lower = q.toLowerCase(); return PRODUCTS.filter(function(p) { return p.title.toLowerCase().indexOf(lower) !== -1 || p.category.toLowerCase().indexOf(lower) !== -1; }); }); }
  };
})();\n`);

console.log('mock-api.js generated successfully!');
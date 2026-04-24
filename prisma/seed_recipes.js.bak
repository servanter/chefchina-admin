/**
 * ChefChina 菜谱种子数据 — 20道经典中国菜
 * 运行: node prisma/seed_recipes.js
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const client = new Client({
  connectionString:
    'postgres://postgres.mlzyxmndtertlwqbqfjr:qAOZSvpOuLF08Er1@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 20000,
});

// ─── 20 道菜谱 ────────────────────────────────────────────────────────────────
const RECIPES = [
  {
    id: 'rec_06', titleEn: 'Twice-Cooked Pork', titleZh: '回锅肉',
    descriptionEn: 'A classic Sichuan dish of pork belly boiled then stir-fried with spicy bean paste, leeks and bell peppers.',
    descriptionZh: '四川经典名菜，五花肉先煮后炒，配以豆瓣酱、蒜苗和青椒，香辣鲜美，下饭神器。',
    cover: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&q=80',
    difficulty: 'MEDIUM', cookTime: 45, servings: 3, cat: 'cat_01',
    ingredients: [
      ['五花肉','Pork belly','400','g'],['豆瓣酱','Doubanjiang','2','tbsp'],
      ['蒜苗','Garlic sprouts','2','stalks'],['青椒','Green pepper','1','pcs'],
      ['料酒','Rice wine','1','tbsp'],['生抽','Soy sauce','1','tbsp'],
      ['白糖','Sugar','0.5','tsp'],['姜','Ginger','3','slices'],
    ],
    steps: [
      ['1','Boil the pork','煮肉','Boil pork belly with ginger and rice wine for 20 minutes until cooked. Remove and let cool, then slice thinly.','五花肉加姜片和料酒冷水下锅，煮20分钟至熟，捞出晾凉后切薄片。','https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80',20],
      ['2','Stir-fry pork slices','煸炒肉片','Heat wok, add pork slices and stir-fry until edges curl and fat renders out.','锅烧热不加油，放入肉片煸炒至边缘卷起，出油为止。','https://images.unsplash.com/photo-1556908153-7d2e14c3a8b3?w=400&q=80',5],
      ['3','Add doubanjiang','加豆瓣酱','Push pork to side, add doubanjiang and stir-fry until oil turns red.','将肉片拨到锅边，放入豆瓣酱炒出红油。','https://images.unsplash.com/photo-1607330289024-1aa5d67f8301?w=400&q=80',2],
      ['4','Add vegetables and finish','加配菜收锅','Add garlic sprouts and green pepper, season with soy sauce and sugar, toss well.','加入蒜苗和青椒，调入生抽和白糖，大火翻炒均匀即可。','https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&q=80',3],
    ],
  },
  {
    id: 'rec_07', titleEn: 'Fish-Fragrant Pork Shreds', titleZh: '鱼香肉丝',
    descriptionEn: 'Tender pork shreds in a savory-sweet-sour sauce with black fungus, bamboo shoots and carrots. No fish involved!',
    descriptionZh: '鱼香肉丝是川菜经典，嫩滑猪肉搭配黑木耳、竹笋，酸甜咸辣的鱼香味令人回味无穷。',
    cover: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=800&q=80',
    difficulty: 'EASY', cookTime: 20, servings: 2, cat: 'cat_01',
    ingredients: [
      ['猪里脊','Pork loin','250','g'],['黑木耳','Black fungus','30','g'],
      ['胡萝卜','Carrot','1','pcs'],['竹笋','Bamboo shoots','80','g'],
      ['豆瓣酱','Doubanjiang','1','tbsp'],['醋','Vinegar','1','tbsp'],
      ['白糖','Sugar','1','tbsp'],['生抽','Soy sauce','1','tbsp'],
      ['淀粉','Cornstarch','1','tsp'],
    ],
    steps: [
      ['1','Prep ingredients','食材处理','Julienne pork, carrot and bamboo shoots. Soak black fungus and tear into strips.','猪肉、胡萝卜、竹笋切细丝；黑木耳泡发后撕成条。','https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=400&q=80',15],
      ['2','Marinate pork','腌制猪肉','Mix pork with cornstarch, soy sauce and rice wine, marinate 10 minutes.','猪肉丝加淀粉、生抽、料酒腌制10分钟。','https://images.unsplash.com/photo-1585238341710-309f85a8c4e1?w=400&q=80',10],
      ['3','Make the sauce','调鱼香汁','Mix vinegar, sugar, soy sauce, cornstarch and water into the classic fish-fragrant sauce.','醋、白糖、生抽、淀粉、水调成鱼香汁备用。','https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=400&q=80',2],
      ['4','Stir-fry everything','翻炒出锅','Stir-fry pork until cooked, add doubanjiang, then vegetables, finally pour in sauce.','炒熟肉丝，加豆瓣酱炒香，放蔬菜翻炒，倒入鱼香汁大火收汁。','https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',5],
    ],
  },
  {
    id: 'rec_08', titleEn: 'Husband and Wife Beef Slices', titleZh: '夫妻肺片',
    descriptionEn: 'Cold appetizer of thinly sliced beef and offal in a deeply aromatic, numbing-spicy Sichuan sauce.',
    descriptionZh: '成都著名凉菜，薄切牛肉配以麻辣红油、花椒和芝麻，麻辣鲜香，开胃爽口。',
    cover: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&q=80',
    difficulty: 'MEDIUM', cookTime: 60, servings: 4, cat: 'cat_01',
    ingredients: [
      ['牛腱肉','Beef shank','500','g'],['牛舌','Beef tongue','200','g'],
      ['红油','Chili oil','3','tbsp'],['花椒粉','Sichuan pepper powder','1','tsp'],
      ['芝麻','Sesame seeds','2','tbsp'],['花生','Roasted peanuts','50','g'],
      ['生抽','Soy sauce','2','tbsp'],['香醋','Black vinegar','1','tbsp'],
      ['白糖','Sugar','1','tsp'],['葱','Spring onion','2','stalks'],
    ],
    steps: [
      ['1','Braise the beef','卤制牛肉','Boil beef shank and tongue with spices (star anise, cinnamon, bay leaf) for 90 minutes.','牛腱和牛舌加八角、桂皮、香叶小火卤制90分钟至软烂。','https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&q=80',90],
      ['2','Slice thinly','切薄片','Once cooled, slice beef and tongue into very thin slices (2mm).','晾凉后将牛肉和牛舌切成约2mm的薄片摆盘。','https://images.unsplash.com/photo-1594756202469-9ff9799cf7fd?w=400&q=80',10],
      ['3','Mix the sauce','调红油汁','Combine chili oil, Sichuan pepper, soy sauce, vinegar and sugar.','红油、花椒粉、生抽、香醋、白糖调匀成红油汁。','https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80',3],
      ['4','Assemble and serve','淋汁装盘','Pour sauce over beef slices, top with peanuts and sesame seeds.','将红油汁淋在肉片上，撒花生碎和芝麻即可。','https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80',2],
    ],
  },
  {
    id: 'rec_09', titleEn: 'Cantonese Steamed Fish', titleZh: '清蒸鱼',
    descriptionEn: 'Whole fish steamed to perfection with ginger and spring onion, finished with sizzling hot oil and premium soy sauce.',
    descriptionZh: '粤菜精华，整条鱼蒸至嫩滑，淋上豉油和葱丝，浇上滚热油爆香，鲜嫩无比。',
    cover: 'https://images.unsplash.com/photo-1535400255456-984b6f3ac5ac?w=800&q=80',
    difficulty: 'EASY', cookTime: 15, servings: 3, cat: 'cat_02',
    ingredients: [
      ['鲈鱼','Sea bass','1','whole'],['生姜','Ginger','5','slices'],
      ['葱','Spring onion','3','stalks'],['蒸鱼豉油','Steaming soy sauce','3','tbsp'],
      ['白糖','Sugar','0.5','tsp'],['食用油','Cooking oil','3','tbsp'],
      ['料酒','Rice wine','1','tbsp'],
    ],
    steps: [
      ['1','Prepare the fish','处理鱼','Score the fish on both sides. Rub inside and out with salt and rice wine.','鱼两面打花刀，内外抹少许盐和料酒腌制5分钟。','https://images.unsplash.com/photo-1606851989470-f06a8348d3bb?w=400&q=80',8],
      ['2','Steam the fish','蒸鱼','Place fish on plate with ginger strips. Steam over high heat for 8-10 minutes.','鱼身铺姜丝，大火蒸8-10分钟至熟透。','https://images.unsplash.com/photo-1535400255456-984b6f3ac5ac?w=400&q=80',10],
      ['3','Add toppings','放葱丝','Drain steam water from plate. Top fish with fresh spring onion shreds.','倒掉盘中蒸出的水，铺上新鲜葱丝。','https://images.unsplash.com/photo-1595543932476-d77c04bce4b9?w=400&q=80',2],
      ['4','Pour hot oil','淋热油','Heat oil in pan until smoking. Pour over fish to release aromas, then drizzle with steaming soy sauce.','锅中油烧至冒烟，泼在葱丝上爆香，再淋入蒸鱼豉油即可。','https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80',2],
    ],
  },
  {
    id: 'rec_10', titleEn: 'Char Siu (BBQ Pork)', titleZh: '叉烧肉',
    descriptionEn: 'Cantonese-style barbecued pork marinated in a sweet and savory glaze, with a caramelized, slightly charred exterior.',
    descriptionZh: '粤式叉烧是广东烧腊的代表，蜜汁腌制的猪颈肉烤至焦糖化，外焦里嫩，香甜可口。',
    cover: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=800&q=80',
    difficulty: 'MEDIUM', cookTime: 40, servings: 4, cat: 'cat_02',
    ingredients: [
      ['猪颈肉','Pork neck','600','g'],['叉烧酱','Char siu sauce','3','tbsp'],
      ['生抽','Soy sauce','2','tbsp'],['老抽','Dark soy sauce','1','tbsp'],
      ['蜂蜜','Honey','2','tbsp'],['料酒','Rice wine','1','tbsp'],
      ['五香粉','Five spice powder','0.5','tsp'],['蒜','Garlic','3','cloves'],
    ],
    steps: [
      ['1','Marinate the pork','腌制叉烧','Mix all marinade ingredients. Coat pork thoroughly and refrigerate overnight (min 4 hours).','将所有腌料混合，均匀涂抹猪肉，冷藏腌制过夜（最少4小时）。','https://images.unsplash.com/photo-1588347818036-eee724b3e93f?w=400&q=80',10],
      ['2','Preheat oven','预热烤箱','Preheat oven to 220°C. Line a baking tray with foil.','烤箱预热至220°C，烤盘铺好锡纸。','https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=400&q=80',10],
      ['3','Roast the pork','烤制','Roast for 25 minutes, basting with marinade halfway through.','放入烤箱烤25分钟，中途刷一次腌料翻面。','https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&q=80',25],
      ['4','Glaze with honey','刷蜂蜜','Brush with honey, set to grill/broil for 3-5 minutes until caramelized.','最后刷上蜂蜜，调至烧烤模式再烤3-5分钟至焦糖色即可。','https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=400&q=80',5],
    ],
  },
  {
    id: 'rec_11', titleEn: 'Cantonese Wonton Soup', titleZh: '广式云吞汤',
    descriptionEn: 'Delicate pork and shrimp wontons in a clear, rich broth made from dried flounder and shrimp roe.',
    descriptionZh: '广式云吞皮薄馅嫩，猪肉虾仁馅料鲜美，搭配用大地鱼熬制的清汤，是广东人的家常美食。',
    cover: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80',
    difficulty: 'MEDIUM', cookTime: 30, servings: 4, cat: 'cat_02',
    ingredients: [
      ['云吞皮','Wonton wrappers','40','pcs'],['猪肉馅','Minced pork','250','g'],
      ['虾仁','Shrimp','150','g'],['鸡汤','Chicken broth','1','L'],
      ['大地鱼粉','Dried flounder powder','1','tbsp'],['生抽','Soy sauce','1','tbsp'],
      ['芝麻油','Sesame oil','1','tsp'],['小葱','Scallion','3','stalks'],
      ['白胡椒','White pepper','0.5','tsp'],
    ],
    steps: [
      ['1','Make the filling','调馅','Combine minced pork, diced shrimp, soy sauce, sesame oil and white pepper. Mix until sticky.','猪肉馅加虾仁末、生抽、芝麻油、白胡椒，顺一方向搅打至起胶。','https://images.unsplash.com/photo-1604908815604-52ab88b1fc41?w=400&q=80',10],
      ['2','Wrap wontons','包云吞','Place a teaspoon of filling in the center of each wrapper, fold and seal.','取适量馅料置于皮中央，对折捏紧两角，包成云吞形状。','https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80',20],
      ['3','Prepare broth','熬汤底','Heat chicken broth with dried flounder powder and season to taste.','鸡汤加大地鱼粉煮开，调味备用。','https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80',5],
      ['4','Cook and serve','煮云吞','Boil wontons until they float plus 2 more minutes. Serve in broth with scallions.','云吞入沸水煮至浮起再煮2分钟，捞入汤碗，撒葱花即可。','https://images.unsplash.com/photo-1604908816102-b2d1d19c14ca?w=400&q=80',5],
    ],
  },
  {
    id: 'rec_12', titleEn: 'Cantonese Steamed Egg Custard', titleZh: '蒸水蛋',
    descriptionEn: 'Silky smooth steamed egg custard with a melt-in-your-mouth texture, topped with a touch of soy sauce and sesame oil.',
    descriptionZh: '广东家常菜，鸡蛋加温水蒸制成嫩滑如豆腐的蛋羹，淋上豉油和芝麻油，简单美味。',
    cover: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',
    difficulty: 'EASY', cookTime: 15, servings: 2, cat: 'cat_02',
    ingredients: [
      ['鸡蛋','Eggs','3','pcs'],['温水','Warm water','300','ml'],
      ['生抽','Soy sauce','1','tbsp'],['芝麻油','Sesame oil','0.5','tsp'],
      ['盐','Salt','0.5','tsp'],['小葱','Scallion','1','stalk'],
    ],
    steps: [
      ['1','Beat the eggs','打散鸡蛋','Beat eggs gently. Add warm water (1:1.5 ratio) and salt, stir without creating bubbles.','鸡蛋轻轻打散，加入1.5倍温水和盐，轻搅均匀不要起泡。','https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=400&q=80',5],
      ['2','Strain the mixture','过筛','Strain egg mixture through a fine sieve for extra smoothness.','将蛋液过细筛，去除泡沫和杂质，确保口感细腻。','https://images.unsplash.com/photo-1544866092-0fe811afc1eb?w=400&q=80',2],
      ['3','Steam gently','小火蒸制','Cover with wrap/lid, steam on LOW heat for 12-15 minutes.','封上保鲜膜或盖子，小火蒸12-15分钟至凝固。','https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80',15],
      ['4','Season and serve','调味上桌','Drizzle with soy sauce and sesame oil, garnish with scallion.','淋入生抽和芝麻油，撒上葱花即可上桌。','https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=400&q=80',1],
    ],
  },
  {
    id: 'rec_13', titleEn: 'Steamed Fish Head with Chili', titleZh: '剁椒鱼头',
    descriptionEn: 'A Hunan signature dish — steamed fish head blanketed in bright red fermented chilies, fiercely spicy and aromatic.',
    descriptionZh: '湘菜代表作，硕大鱼头铺满剁椒蒸制，辣而不燥，鱼肉鲜嫩，浇上热油爆香，色香味俱全。',
    cover: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80',
    difficulty: 'MEDIUM', cookTime: 25, servings: 4, cat: 'cat_03',
    ingredients: [
      ['鱼头','Fish head (grass carp)','1','whole'],['剁椒','Fermented chili paste','4','tbsp'],
      ['蒜','Garlic','5','cloves'],['姜','Ginger','5','slices'],
      ['生抽','Soy sauce','2','tbsp'],['料酒','Rice wine','1','tbsp'],
      ['食用油','Cooking oil','3','tbsp'],['葱','Spring onion','3','stalks'],
    ],
    steps: [
      ['1','Prepare fish head','处理鱼头','Clean fish head, split in half. Rub with salt, rice wine and ginger slices, marinate 15 minutes.','鱼头洗净对半剖开，用盐、料酒、姜片腌制15分钟去腥。','https://images.unsplash.com/photo-1625937329935-83899e40df8a?w=400&q=80',15],
      ['2','Top with chili','铺剁椒','Mix fermented chili paste with minced garlic and spread evenly over fish head.','剁椒加蒜末拌匀，均匀铺在鱼头上。','https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80',5],
      ['3','Steam','蒸制','Steam over high heat for 12-15 minutes until fish is cooked through.','大火蒸12-15分钟至鱼肉熟透。','https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400&q=80',15],
      ['4','Finish with hot oil','泼热油','Scatter spring onion over fish. Heat oil until smoking and pour over.','蒸好后撒上葱花，烧热油泼上爆香即可。','https://images.unsplash.com/photo-1544807915-288302bd7a1f?w=400&q=80',3],
    ],
  },
  {
    id: 'rec_14', titleEn: 'Mouthwatering Chicken (Saliva Chicken)', titleZh: '口水鸡',
    descriptionEn: 'Poached chicken bathed in a luxurious sauce of chili oil, Sichuan pepper, garlic, sesame paste and fresh herbs.',
    descriptionZh: '口水鸡是四川凉菜经典，白斩鸡淋上麻辣红油酱汁，麻辣鲜香，让人口水直流。',
    cover: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&q=80',
    difficulty: 'EASY', cookTime: 30, servings: 3, cat: 'cat_03',
    ingredients: [
      ['整鸡腿','Chicken legs','4','pcs'],['红油','Chili oil','3','tbsp'],
      ['花椒油','Sichuan pepper oil','1','tbsp'],['芝麻酱','Sesame paste','1','tbsp'],
      ['蒜','Garlic','4','cloves'],['姜','Ginger','3','slices'],
      ['生抽','Soy sauce','2','tbsp'],['醋','Vinegar','1','tbsp'],
      ['花生碎','Crushed peanuts','2','tbsp'],['香菜','Cilantro','handful'],
    ],
    steps: [
      ['1','Poach the chicken','白煮鸡','Boil chicken legs with ginger and scallion for 15 minutes. Remove and plunge into ice water immediately.','鸡腿加姜片葱段冷水下锅，煮15分钟，立即捞出放入冰水中冷却。','https://images.unsplash.com/photo-1604908815604-52ab88b1fc41?w=400&q=80',20],
      ['2','Chop the chicken','斩件','Cut chilled chicken into bite-size pieces and arrange on a plate.','冷却后的鸡腿斩成适口大小，整齐摆盘。','https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&q=80',5],
      ['3','Mix the sauce','调红油汁','Combine chili oil, Sichuan pepper oil, sesame paste, minced garlic, soy sauce and vinegar.','红油、花椒油、芝麻酱、蒜末、生抽、醋调匀成酱汁。','https://images.unsplash.com/photo-1572454591674-2739f30d8c40?w=400&q=80',3],
      ['4','Pour and garnish','淋汁装饰','Pour sauce over chicken, top with crushed peanuts, cilantro and sesame seeds.','将酱汁淋在鸡块上，撒花生碎和香菜点缀即可。','https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80',2],
    ],
  },
  {
    id: 'rec_15', titleEn: 'Peking Duck', titleZh: '北京烤鸭',
    descriptionEn: 'China\'s most iconic dish — lacquered duck with paper-thin crispy skin, served with pancakes, hoisin sauce and cucumber.',
    descriptionZh: '北京烤鸭是中国国菜，枣红色鸭皮酥脆油亮，鸭肉鲜嫩，配荷叶饼和甜面酱食用，享誉全球。',
    cover: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80',
    difficulty: 'HARD', cookTime: 120, servings: 6, cat: 'cat_04',
    ingredients: [
      ['整鸭','Whole duck','1','2kg'],['麦芽糖','Maltose','3','tbsp'],
      ['白醋','White vinegar','2','tbsp'],['荷叶饼','Steamed pancakes','20','pcs'],
      ['甜面酱','Hoisin sauce','4','tbsp'],['黄瓜','Cucumber','1','pcs'],
      ['大葱','Scallion','4','stalks'],['五香粉','Five spice powder','1','tsp'],
    ],
    steps: [
      ['1','Air-dry the duck','风干鸭子','Rub duck with five spice, scald skin with boiling water, brush with maltose-vinegar glaze. Air-dry 12-24 hours.','鸭皮用开水烫紧，刷麦芽糖醋水，挂起风干12-24小时至皮干。','https://images.unsplash.com/photo-1625938145058-0a0f5a6a2b44?w=400&q=80',30],
      ['2','Roast','烤制','Roast at 200°C for 45 minutes, then increase to 220°C for 15 minutes to crisp the skin.','200°C烤45分钟，升温至220°C再烤15分钟，使鸭皮酥脆。','https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80',60],
      ['3','Carve the duck','片鸭','Carve duck into thin slices ensuring each piece has both skin and meat.','将烤鸭片成薄片，每片须带有鸭皮和鸭肉。','https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=400&q=80',10],
      ['4','Wrap and serve','卷饼享用','Spread hoisin sauce on pancake, add duck, cucumber and scallion, roll up and eat.','荷叶饼上抹甜面酱，放鸭片、黄瓜丝和葱丝，卷起即食。','https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=400&q=80',5],
    ],
  },
  {
    id: 'rec_16', titleEn: 'Pork and Cabbage Dumplings', titleZh: '猪肉白菜饺子',
    descriptionEn: 'Homestyle northern Chinese dumplings stuffed with juicy pork and napa cabbage, boiled or pan-fried to perfection.',
    descriptionZh: '北方家常饺子，猪肉白菜馅鲜嫩多汁，皮薄馅大，蘸醋蒜汁食用，是年夜饭的必备美食。',
    cover: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=800&q=80',
    difficulty: 'MEDIUM', cookTime: 60, servings: 4, cat: 'cat_04',
    ingredients: [
      ['猪肉馅','Minced pork','400','g'],['白菜','Napa cabbage','500','g'],
      ['饺子皮','Dumpling wrappers','50','pcs'],['生抽','Soy sauce','2','tbsp'],
      ['芝麻油','Sesame oil','1','tbsp'],['姜末','Minced ginger','1','tbsp'],
      ['料酒','Rice wine','1','tbsp'],['盐','Salt','1','tsp'],
      ['葱花','Chopped scallion','2','tbsp'],
    ],
    steps: [
      ['1','Prepare cabbage','处理白菜','Salt-wilt cabbage, squeeze out excess water, then finely chop.','白菜切碎加盐腌出水，挤干水分备用。','https://images.unsplash.com/photo-1518843875459-f738682238a6?w=400&q=80',15],
      ['2','Make the filling','调馅','Combine pork with soy sauce, sesame oil, ginger, rice wine and scallion. Mix in cabbage.','猪肉馅加生抽、芝麻油、姜末、料酒和葱花搅打上劲，拌入白菜碎。','https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80',10],
      ['3','Wrap dumplings','包饺子','Place filling in wrapper center, fold and pleat to seal into half-moon shape.','取适量馅料放皮中央，对折捏出褶皱封口成半月形。','https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&q=80',30],
      ['4','Boil and serve','煮饺子','Boil in salted water, adding cold water twice; serve when dumplings float and skins are translucent.','下入沸水，点水两次，煮至饺子浮起皮透即可，蘸醋蒜汁食用。','https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=400&q=80',10],
    ],
  },
  {
    id: 'rec_17', titleEn: 'Hot and Sour Soup', titleZh: '酸辣汤',
    descriptionEn: 'A warming Chinese soup with tofu, egg ribbons, wood ear mushrooms and bamboo shoots in a tangy, peppery broth.',
    descriptionZh: '酸辣汤酸辣开胃，豆腐、鸡蛋花、木耳和竹笋在酸辣浓汤中翻滚，暖胃又下饭。',
    cover: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80',
    difficulty: 'EASY', cookTime: 20, servings: 3, cat: 'cat_04',
    ingredients: [
      ['嫩豆腐','Silken tofu','200','g'],['黑木耳','Black fungus','30','g'],
      ['竹笋','Bamboo shoots','80','g'],['鸡蛋','Egg','2','pcs'],
      ['鸡汤','Chicken broth','800','ml'],['白胡椒','White pepper','1','tsp'],
      ['醋','Vinegar','3','tbsp'],['生抽','Soy sauce','2','tbsp'],
      ['淀粉','Cornstarch','2','tbsp'],
    ],
    steps: [
      ['1','Prep ingredients','备料','Julienne tofu, bamboo shoots and wood ear mushrooms.','豆腐、竹笋、木耳均切细丝备用。','https://images.unsplash.com/photo-1606851989470-f06a8348d3bb?w=400&q=80',10],
      ['2','Simmer the broth','煮汤底','Bring chicken broth to a boil, add all julienned ingredients, season with soy sauce.','鸡汤烧开，加入所有食材，用生抽调味。','https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80',5],
      ['3','Thicken the soup','勾芡','Stir in cornstarch slurry to desired consistency.','淀粉加水调成水淀粉，倒入汤中搅拌至浓稠。','https://images.unsplash.com/photo-1544807915-288302bd7a1f?w=400&q=80',2],
      ['4','Add egg and season','打蛋花调味','Drizzle beaten egg in a thin stream while stirring. Add vinegar and white pepper to taste.','将蛋液缓缓倒入，搅出蛋花，加醋和白胡椒调味即可。','https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80',3],
    ],
  },
  {
    id: 'rec_18', titleEn: 'Scallion Pancake', titleZh: '葱油饼',
    descriptionEn: 'Flaky, layered flatbread with fragrant scallions and sesame, pan-fried until golden and crispy on the outside.',
    descriptionZh: '葱油饼是北方经典面食，层次分明，葱香浓郁，外酥里软，是早餐和下午茶的好选择。',
    cover: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80',
    difficulty: 'EASY', cookTime: 30, servings: 3, cat: 'cat_04',
    ingredients: [
      ['面粉','All-purpose flour','300','g'],['热水','Hot water','160','ml'],
      ['葱花','Chopped scallion','80','g'],['盐','Salt','1','tsp'],
      ['食用油','Cooking oil','3','tbsp'],['芝麻','Sesame seeds','1','tbsp'],
      ['花椒粉','Sichuan pepper powder','0.5','tsp'],
    ],
    steps: [
      ['1','Make the dough','和面','Mix flour with hot water, knead into a smooth dough, rest covered for 30 minutes.','面粉加热水揉成光滑面团，盖布醒面30分钟。','https://images.unsplash.com/photo-1590476621905-f845a2a98451?w=400&q=80',35],
      ['2','Layer with oil and scallion','擀饼抹馅','Roll dough thin, brush with oil, sprinkle with salt, pepper and scallion. Roll up tightly, then coil.','面团擀薄，刷油，撒盐、花椒粉和葱花，卷紧后盘成圆形。','https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80',10],
      ['3','Flatten and pan-fry','压饼煎制','Flatten gently, sprinkle sesame. Pan-fry on medium heat, covered, 3-4 minutes per side.','轻轻擀平，撒芝麻，中火盖锅煎3-4分钟至两面金黄即可。','https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400&q=80',8],
    ],
  },
  {
    id: 'rec_19', titleEn: 'Har Gow (Shrimp Dumplings)', titleZh: '虾饺',
    descriptionEn: 'Delicate dim sum dumplings with a translucent, slightly chewy wrapper filled with whole plump shrimp.',
    descriptionZh: '粤式点心经典，透明水晶皮包裹整只大虾，皮薄馅鲜，是衡量一家茶楼水准的标志性点心。',
    cover: 'https://images.unsplash.com/photo-1583394293214-56948a9e1be9?w=800&q=80',
    difficulty: 'HARD', cookTime: 45, servings: 4, cat: 'cat_05',
    ingredients: [
      ['鲜虾','Fresh shrimp','400','g'],['澄粉','Wheat starch','200','g'],
      ['生粉','Tapioca starch','50','g'],['猪肥肉','Pork fat','50','g'],
      ['竹笋','Bamboo shoots','60','g'],['盐','Salt','0.5','tsp'],
      ['糖','Sugar','0.5','tsp'],['芝麻油','Sesame oil','1','tsp'],
      ['白胡椒','White pepper','0.25','tsp'],
    ],
    steps: [
      ['1','Make crystal dough','调水晶皮','Pour boiling water into wheat starch and tapioca, knead into a smooth, translucent dough.','澄粉和生粉混合，倒入沸水边倒边搅，揉成光滑水晶面团。','https://images.unsplash.com/photo-1590476621905-f845a2a98451?w=400&q=80',15],
      ['2','Prepare shrimp filling','调虾馅','Devein shrimp, keep some whole, mince the rest. Mix with bamboo shoots, fat, and seasonings.','虾仁去虾线，留整只虾，其余剁碎，加竹笋末、肥肉丁和调料拌匀。','https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400&q=80',15],
      ['3','Wrap with cleaver','擀皮包制','Use a cleaver or flat object to press dough into thin round wrappers.','取小块面团用刀背擀成圆形薄皮，包入馅料，捏出褶皱封口。','https://images.unsplash.com/photo-1583394293214-56948a9e1be9?w=400&q=80',20],
      ['4','Steam','蒸制','Steam on oiled bamboo steamer over high heat for 6-8 minutes.','放入刷了油的竹制蒸笼，大火蒸6-8分钟即可。','https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400&q=80',8],
    ],
  },
  {
    id: 'rec_20', titleEn: 'Hong Kong Egg Tart', titleZh: '港式蛋挞',
    descriptionEn: 'Buttery flaky pastry shells filled with a smooth, lightly sweetened egg custard — Hong Kong\'s iconic bakery staple.',
    descriptionZh: '港式蛋挞是香港茶餐厅必备点心，酥脆牛油挞皮配嫩滑蛋黄馅，入口即化，令人回味。',
    cover: 'https://images.unsplash.com/photo-1625938145744-533e82abfaf7?w=800&q=80',
    difficulty: 'MEDIUM', cookTime: 35, servings: 12, cat: 'cat_05',
    ingredients: [
      ['低筋面粉','Cake flour','200','g'],['黄油','Butter','120','g'],
      ['糖粉','Powdered sugar','40','g'],['鸡蛋','Eggs','4','pcs'],
      ['牛奶','Milk','150','ml'],['淡奶油','Fresh cream','50','ml'],
      ['细砂糖','Caster sugar','80','g'],['香草精','Vanilla extract','0.5','tsp'],
    ],
    steps: [
      ['1','Make pastry shell','制作挞皮','Cream butter and sugar, add egg yolk, fold in sifted flour to form dough. Chill 30 minutes.','黄油和糖粉打发，加蛋黄，筛入低筋面粉揉成面团，冷藏30分钟。','https://images.unsplash.com/photo-1590476621905-f845a2a98451?w=400&q=80',15],
      ['2','Line tart molds','铺模','Press dough into tart molds, trim edges. Chill shaped shells for 15 minutes.','将面团均匀铺入蛋挞模具，修整边缘，冷藏定型15分钟。','https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?w=400&q=80',15],
      ['3','Make the custard','调蛋液','Whisk eggs, sugar, milk, cream and vanilla. Strain through a sieve.','鸡蛋加糖搅散，加入牛奶、淡奶油和香草精搅匀，过细筛备用。','https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=400&q=80',5],
      ['4','Bake','烤制','Pour custard into shells. Bake at 190°C for 20 minutes until custard is just set.','将蛋液倒入挞皮，190°C烤约20分钟至蛋液凝固表面微黄即可。','https://images.unsplash.com/photo-1625938145744-533e82abfaf7?w=400&q=80',20],
    ],
  },
  {
    id: 'rec_21', titleEn: 'Red Braised Beef Noodle Soup', titleZh: '红烧牛肉面',
    descriptionEn: 'Hearty Taiwanese-style beef noodle soup with melt-tender braised beef in a rich, spicy soy broth.',
    descriptionZh: '台湾红烧牛肉面是华人最爱的面食之一，浓郁的红烧汤底配软烂牛肉，一碗下肚暖胃满足。',
    cover: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80',
    difficulty: 'MEDIUM', cookTime: 120, servings: 4, cat: 'cat_06',
    ingredients: [
      ['牛腩','Beef brisket','600','g'],['拉面','Ramen noodles','400','g'],
      ['豆瓣酱','Doubanjiang','2','tbsp'],['番茄','Tomatoes','2','pcs'],
      ['洋葱','Onion','1','pcs'],['生抽','Soy sauce','3','tbsp'],
      ['老抽','Dark soy sauce','1','tbsp'],['料酒','Rice wine','2','tbsp'],
      ['八角','Star anise','2','pcs'],['桂皮','Cinnamon','1','stick'],
      ['小白菜','Baby bok choy','4','pcs'],
    ],
    steps: [
      ['1','Blanch the beef','汆烫牛肉','Cut beef into large chunks, blanch in boiling water 3 minutes, drain.','牛腩切大块，冷水下锅焯水3分钟，捞出洗净。','https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80',10],
      ['2','Brown aromatics','炒香底料','Stir-fry doubanjiang, onion and tomatoes until fragrant.','热油炒香豆瓣酱，加洋葱和番茄翻炒出汁。','https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80',8],
      ['3','Braise the beef','红烧牛腩','Add beef, soy sauces, spices and enough water to cover. Simmer 90 minutes.','加入牛腩，倒入生抽、老抽、料酒和香料，加水没过，小火炖90分钟。','https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&q=80',90],
      ['4','Cook noodles and assemble','煮面装碗','Cook noodles and bok choy. Arrange in bowl with beef and ladle over broth.','另锅煮面条和小白菜，捞入碗中，放牛腩，浇上浓汤即可。','https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&q=80',10],
    ],
  },
  {
    id: 'rec_22', titleEn: 'Yangzhou Fried Rice', titleZh: '扬州炒饭',
    descriptionEn: 'The gold standard of Chinese fried rice — fluffy egg-coated grains with shrimp, char siu, peas and scallions.',
    descriptionZh: '扬州炒饭是炒饭界的标杆，粒粒金黄，配以虾仁、叉烧、豌豆和鸡蛋，香气四溢。',
    cover: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=800&q=80',
    difficulty: 'EASY', cookTime: 15, servings: 2, cat: 'cat_06',
    ingredients: [
      ['隔夜米饭','Day-old cooked rice','400','g'],['鸡蛋','Eggs','3','pcs'],
      ['虾仁','Shrimp','100','g'],['叉烧','Char siu pork','80','g'],
      ['豌豆','Green peas','50','g'],['胡萝卜','Carrot','half','pcs'],
      ['生抽','Soy sauce','1','tbsp'],['盐','Salt','0.5','tsp'],
      ['葱花','Chopped scallion','2','tbsp'],
    ],
    steps: [
      ['1','Prep the ingredients','备料','Dice char siu and carrot. Beat eggs with a pinch of salt.','叉烧和胡萝卜切小丁，鸡蛋加少许盐打散备用。','https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=400&q=80',5],
      ['2','Scramble the eggs','炒蛋','Heat wok with oil, pour in egg and scramble until just set. Push to side.','热锅下油，倒入蛋液快速翻炒至刚凝固，推至锅边。','https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=400&q=80',2],
      ['3','Stir-fry everything','翻炒米饭','Add rice, break up clumps. Stir-fry on high heat until each grain is separate.','加入米饭，大火翻炒至米饭粒粒分开，加入所有配料翻炒均匀。','https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&q=80',5],
      ['4','Season and serve','调味出锅','Season with soy sauce and salt, add scallion, toss and serve.','加生抽和盐调味，撒葱花翻炒均匀即可出锅。','https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80',2],
    ],
  },
  {
    id: 'rec_23', titleEn: 'Dan Dan Noodles', titleZh: '担担面',
    descriptionEn: 'Iconic Sichuan street noodles — springy wheat noodles in a sesame-chili sauce with minced pork and preserved vegetables.',
    descriptionZh: '担担面是成都最著名的街头小吃，筋道面条拌以芝麻酱、红油和碎肉，麻辣鲜香，回味悠长。',
    cover: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&q=80',
    difficulty: 'EASY', cookTime: 20, servings: 2, cat: 'cat_06',
    ingredients: [
      ['细面条','Thin wheat noodles','200','g'],['猪肉馅','Minced pork','150','g'],
      ['芽菜','Yibin preserved vegetables','2','tbsp'],['芝麻酱','Sesame paste','2','tbsp'],
      ['红油','Chili oil','2','tbsp'],['花椒油','Sichuan pepper oil','1','tsp'],
      ['生抽','Soy sauce','1','tbsp'],['醋','Vinegar','1','tsp'],
      ['糖','Sugar','0.5','tsp'],['葱花','Scallion','1','tbsp'],
    ],
    steps: [
      ['1','Fry the pork','炒臊子','Stir-fry minced pork with preserved vegetables until dry and fragrant.','猪肉末加芽菜下锅干炒，炒至酥香出油为止。','https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=400&q=80',8],
      ['2','Mix the sauce','调酱底','In each bowl, mix sesame paste, chili oil, Sichuan pepper oil, soy sauce, vinegar and sugar.','碗中放芝麻酱、红油、花椒油、生抽、醋和糖，调成酱底。','https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=400&q=80',3],
      ['3','Cook the noodles','煮面','Boil noodles until just cooked, al dente. Reserve a splash of cooking water.','面条下锅煮至有嚼劲，保留少许面汤。','https://images.unsplash.com/photo-1555126634-323283e090fa?w=400&q=80',5],
      ['4','Assemble','拌面装碗','Add hot noodles to sauce bowl, top with pork and scallion. Toss before eating.','面条捞入酱碗，加上臊子和葱花，吃前拌匀即可。','https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&q=80',2],
    ],
  },
  {
    id: 'rec_24', titleEn: 'Crossing the Bridge Noodles', titleZh: '过桥米线',
    descriptionEn: 'Yunnan\'s legendary dish — raw ingredients are placed in a separate super-hot broth to cook tableside.',
    descriptionZh: '云南过桥米线以其独特的吃法著称，滚烫高汤倒入碗中，将生肉和蔬菜烫熟，风味独特。',
    cover: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80',
    difficulty: 'MEDIUM', cookTime: 40, servings: 2, cat: 'cat_06',
    ingredients: [
      ['米线','Rice noodles','300','g'],['鸡肉片','Sliced chicken breast','150','g'],
      ['猪腰片','Sliced pork kidney','100','g'],['鹌鹑蛋','Quail eggs','4','pcs'],
      ['豆芽','Bean sprouts','100','g'],['菠菜','Spinach','80','g'],
      ['火腿片','Ham slices','80','g'],['鸡汤','Chicken broth','1','L'],
      ['猪油','Lard','1','tbsp'],
    ],
    steps: [
      ['1','Prepare the broth','熬高汤','Bring rich chicken broth to a vigorous boil. Add lard to create an insulating oil layer.','浓鸡汤大火烧开，加入猪油，油层可保温使汤长时间保持高温。','https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80',10],
      ['2','Slice all ingredients','切配食材','Slice chicken and pork paper-thin. Arrange all raw ingredients on separate plates.','鸡肉和猪腰切薄片，所有食材分别摆入小碟，准备就绪。','https://images.unsplash.com/photo-1594756202469-9ff9799cf7fd?w=400&q=80',15],
      ['3','Cook noodles','煮米线','Blanch rice noodles until soft, drain and place in serving bowl.','米线提前泡发，下锅烫软，捞入大碗备用。','https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80',10],
      ['4','Tableside cooking','桌边烫食','Pour boiling broth into the bowl, add thin slices of meat first, then vegetables and eggs.','将沸腾高汤冲入碗中，先放肉片烫熟，再加蔬菜和鹌鹑蛋即可食用。','https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&q=80',5],
    ],
  },
  {
    id: 'rec_25', titleEn: 'Lotus Root Pork Rib Soup', titleZh: '莲藕排骨汤',
    descriptionEn: 'A nourishing Chinese comfort soup with pork ribs and lotus root simmered for hours into a milky, sweet broth.',
    descriptionZh: '莲藕排骨汤是湖北家常滋补汤，猪排骨和莲藕慢炖数小时，汤色奶白，清甜滋润。',
    cover: 'https://images.unsplash.com/photo-1551504734-5da7e163f74a?w=800&q=80',
    difficulty: 'EASY', cookTime: 90, servings: 4, cat: 'cat_03',
    ingredients: [
      ['猪排骨','Pork ribs','600','g'],['莲藕','Lotus root','500','g'],
      ['姜','Ginger','4','slices'],['红枣','Red dates','6','pcs'],
      ['枸杞','Wolfberries','1','tbsp'],['盐','Salt','1','tsp'],
      ['料酒','Rice wine','1','tbsp'],['葱','Spring onion','2','stalks'],
    ],
    steps: [
      ['1','Blanch the ribs','焯排骨','Blanch pork ribs in boiling water with rice wine for 3 minutes. Rinse clean.','排骨冷水加料酒下锅，焯水3分钟去血水，捞出洗净。','https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80',8],
      ['2','Prep lotus root','处理莲藕','Peel lotus root and cut into thick rounds. Soak in water to prevent browning.','莲藕去皮切厚片，泡入清水中防止氧化变黑。','https://images.unsplash.com/photo-1518843875459-f738682238a6?w=400&q=80',5],
      ['3','Simmer the soup','小火慢炖','Combine ribs, lotus root, ginger, dates and cold water. Bring to a boil, then simmer 90 minutes.','排骨、莲藕、姜片、红枣加冷水，大火烧开后转小火炖90分钟。','https://images.unsplash.com/photo-1551504734-5da7e163f74a?w=400&q=80',90],
      ['4','Season and finish','调味出锅','Add wolfberries, season with salt, simmer 5 more minutes.','加入枸杞，用盐调味，再煮5分钟即可出锅。','https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400&q=80',5],
    ],
  },
];

async function seed() {
  await client.connect();
  console.log('Connected to database ✓');

  let recipeCount = 0;
  let stepCount = 0;
  let ingCount = 0;

  for (const r of RECIPES) {
    // Insert recipe
    await client.query(
      `INSERT INTO recipes
        (id,"titleEn","titleZh","descriptionEn","descriptionZh","coverImage",difficulty,"cookTimeMin",servings,"isPublished","authorId","categoryId")
       VALUES ($1,$2,$3,$4,$5,$6,$7::"Difficulty",$8,$9,true,'usr_admin',$10)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.titleEn, r.titleZh, r.descriptionEn, r.descriptionZh,
       r.cover, r.difficulty, r.cookTime, r.servings, r.cat]
    );
    recipeCount++;

    // Insert ingredients
    for (let i = 0; i < r.ingredients.length; i++) {
      const [nameZh, nameEn, amount, unit] = r.ingredients[i];
      const ingId = `${r.id}_ing_${String(i + 1).padStart(2, '0')}`;
      await client.query(
        `INSERT INTO ingredients (id,"recipeId","nameEn","nameZh",amount,unit)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [ingId, r.id, nameEn, nameZh, amount, unit]
      );
      ingCount++;
    }

    // Insert steps
    for (let i = 0; i < r.steps.length; i++) {
      const [num, titleEn, titleZh, contentEn, contentZh, image, duration] = r.steps[i];
      const stepId = `${r.id}_step_${String(i + 1).padStart(2, '0')}`;
      await client.query(
        `INSERT INTO recipe_steps
          (id,"recipeId","stepNumber","titleEn","titleZh","contentEn","contentZh",image,"durationMin")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [stepId, r.id, parseInt(num), titleEn, titleZh, contentEn, contentZh,
         image || null, duration || null]
      );
      stepCount++;
    }

    console.log(`  ✓ ${r.titleZh} (${r.titleEn})`);
  }

  // Verify
  const total = await client.query('SELECT COUNT(*) FROM recipes');
  console.log(`\n✅ Done! Inserted ${recipeCount} recipes, ${stepCount} steps, ${ingCount} ingredients`);
  console.log(`   Total recipes in DB: ${total.rows[0].count}`);

  await client.end();
}

seed().catch(e => {
  console.error('Error:', e.message);
  client.end();
});

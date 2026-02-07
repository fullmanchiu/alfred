-- 转换剩余的分类图标从 hex 代码到 Material Icon 名称

-- 住房 - 水电气网
UPDATE categories SET icon = 'water_drop' WHERE icon = 'e3e4';
UPDATE categories SET icon = 'local_fire_department' WHERE icon = 'e7d6';
UPDATE categories SET icon = 'power' WHERE icon = 'e1c9';
UPDATE categories SET icon = 'wifi' WHERE icon = 'e1e2';

-- 订阅
UPDATE categories SET icon = 'fitness_center' WHERE icon = 'e50a';

-- 宠物
UPDATE categories SET icon = 'content_cut' WHERE icon = 'e87c';

-- 健康
UPDATE categories SET icon = 'vaccines' WHERE icon = 'eb4c';
UPDATE categories SET icon = 'medical_services' WHERE icon = 'e85d';

-- 教育
UPDATE categories SET icon = 'quiz' WHERE icon = 'f04c';

-- 人情
UPDATE categories SET icon = 'card_giftcard' WHERE icon = 'e8dc';
UPDATE categories SET icon = 'volunteer_activism' WHERE icon = 'e227';
UPDATE categories SET icon = 'elderly' WHERE icon = 'e25a';

-- 薪资
UPDATE categories SET icon = 'payments' WHERE icon = 'ef63';
UPDATE categories SET icon = 'attach_money' WHERE icon = 'e145';
UPDATE categories SET icon = 'account_balance_wallet' WHERE icon = 'e850';
UPDATE categories SET icon = 'work' WHERE icon = 'e8f9';
UPDATE categories SET icon = 'redeem' WHERE icon = 'e8d0';
UPDATE categories SET icon = 'trending_up' WHERE icon = 'e8e5';

-- 理财
UPDATE categories SET icon = 'show_chart' WHERE icon = 'e6e1';
UPDATE categories SET icon = 'account_balance' WHERE icon = 'e870';
UPDATE categories SET icon = 'savings' WHERE icon = 'eb70';
UPDATE categories SET icon = 'request_quote' WHERE icon = 'e263';

-- 兼职
UPDATE categories SET icon = 'work_history' WHERE icon = 'f0e2';
UPDATE categories SET icon = 'support_agent' WHERE icon = 'ea4a';

-- 礼金
UPDATE categories SET icon = 'cake' WHERE icon = 'ea65';

-- 报销
UPDATE categories SET icon = 'receipt_long' WHERE icon = 'e8b4';
UPDATE categories SET icon = 'business_center' WHERE icon = 'e871';

-- 转账
UPDATE categories SET icon = 'sync_alt' WHERE icon = 'e0ba';
UPDATE categories SET icon = 'account_balance' WHERE icon = 'e0d0';

-- 其他
UPDATE categories SET icon = 'more_horiz' WHERE icon = 'e574';

-- 将分类的图标从 hex 代码转换为 Material Icon 名称
-- 这样前后端可以直接使用名称，无需转换

UPDATE categories SET icon = 'restaurant' WHERE icon = 'e56c';
UPDATE categories SET icon = 'free_breakfast' WHERE icon = 'ea54';
UPDATE categories SET icon = 'lunch_dining' WHERE icon = 'ea61';
UPDATE categories SET icon = 'dinner_dining' WHERE icon = 'ea57';
UPDATE categories SET icon = 'fastfood' WHERE icon = 'eaac';
UPDATE categories SET icon = 'local_cafe' WHERE icon = 'e541';
UPDATE categories SET icon = 'nights_stay' WHERE icon = 'ea73';

-- 交通
UPDATE categories SET icon = 'directions_car' WHERE icon = 'e531';
UPDATE categories SET icon = 'directions_transit' WHERE icon = 'e535';
UPDATE categories SET icon = 'local_taxi' WHERE icon = 'e559';
UPDATE categories SET icon = 'local_parking' WHERE icon = 'e54f';
UPDATE categories SET icon = 'ev_station' WHERE icon = 'e558';
UPDATE categories SET icon = 'build' WHERE icon = 'f10b';
UPDATE categories SET icon = 'verified_user' WHERE icon = 'e1d5';
UPDATE categories SET icon = 'train' WHERE icon = 'e534';
UPDATE categories SET icon = 'flight' WHERE icon = 'e539';
UPDATE categories SET icon = 'directions_bike' WHERE icon = 'e52f';

-- 购物
UPDATE categories SET icon = 'shopping_cart' WHERE icon = 'e8cc';
UPDATE categories SET icon = 'shopping_basket' WHERE icon = 'e8d1';
UPDATE categories SET icon = 'checkroom' WHERE icon = 'f19e';
UPDATE categories SET icon = 'devices' WHERE icon = 'e1b1';
UPDATE categories SET icon = 'weekend' WHERE icon = 'e16b';

-- 住房
UPDATE categories SET icon = 'home' WHERE icon = 'e88a';
UPDATE categories SET icon = 'payments' WHERE icon = 'ea40';
UPDATE categories SET icon = 'villa' WHERE icon = 'ea44';
UPDATE categories SET icon = 'hotel' WHERE icon = 'e53a';
UPDATE categories SET icon = 'meeting_room' WHERE icon = 'eb4f';

-- 通讯
UPDATE categories SET icon = 'phone' WHERE icon = 'e325';
UPDATE categories SET icon = 'data_usage' WHERE icon = 'e0be';
UPDATE categories SET icon = 'router' WHERE icon = 'e328';
UPDATE categories SET icon = 'contacts' WHERE icon = 'e0cd';
UPDATE categories SET icon = 'message' WHERE icon = 'e61c';
UPDATE categories SET icon = 'email' WHERE icon = 'e0be';

-- 订阅
UPDATE categories SET icon = 'subscriptions' WHERE icon = 'f01f';
UPDATE categories SET icon = 'play_circle' WHERE icon = 'e405';
UPDATE categories SET icon = 'apps' WHERE icon = 'e30a';
UPDATE categories SET icon = 'sports_esports' WHERE icon = 'e338';
UPDATE categories SET icon = 'movie' WHERE icon = 'e02c';
UPDATE categories SET icon = 'book' WHERE icon = 'e865';
UPDATE categories SET icon = 'cloud' WHERE icon = 'e2eb';
UPDATE categories SET icon = 'currency_bitcoin' WHERE icon = 'ebc5';

-- 宠物
UPDATE categories SET icon = 'pets' WHERE icon = 'e91d';
UPDATE categories SET icon = 'restaurant' WHERE icon = 'e56c';
UPDATE categories SET icon = 'medical_services' WHERE icon = 'f033';
UPDATE categories SET icon = 'local_hospital' WHERE icon = 'e548';

-- 娱乐
UPDATE categories SET icon = 'play_circle' WHERE icon = 'e405';
UPDATE categories SET icon = 'sports_esports' WHERE icon = 'e021';
UPDATE categories SET icon = 'movie' WHERE icon = 'e02c';
UPDATE categories SET icon = 'theater_comedy' WHERE icon = 'ea66';
UPDATE categories SET icon = 'event' WHERE icon = 'e53f';
UPDATE categories SET icon = 'flight' WHERE icon = 'e407';
UPDATE categories SET icon = 'photo_camera' WHERE icon = 'e412';

-- 健康
UPDATE categories SET icon = 'health_and_safety' WHERE icon = 'e1d5';
UPDATE categories SET icon = 'assignment' WHERE icon = 'f109';
UPDATE categories SET icon = 'medication' WHERE icon = 'f033';
UPDATE categories SET icon = 'local_hospital' WHERE icon = 'e548';

-- 教育
UPDATE categories SET icon = 'school' WHERE icon = 'e80c';
UPDATE categories SET icon = 'payments' WHERE icon = 'e84f';
UPDATE categories SET icon = 'menu_book' WHERE icon = 'ea19';
UPDATE categories SET icon = 'cast_for_education' WHERE icon = 'efec';

-- 人情
UPDATE categories SET icon = 'card_giftcard' WHERE icon = 'e8f6';
UPDATE categories SET icon = 'restaurant_menu' WHERE icon = 'e8b1';
UPDATE categories SET icon = 'redeem' WHERE icon = 'e87d';
UPDATE categories SET icon = 'volunteer_activism' WHERE icon = 'e838';

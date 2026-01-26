import 'package:flutter/material.dart';
import 'dart:convert';

/// Flutter 图标对照表 - 显示所有内置图标及其码点
/// 用于查找正确的 icon 码点
class IconReferencePage extends StatefulWidget {
  const IconReferencePage({super.key});

  @override
  State<IconReferencePage> createState() => _IconReferencePageState();
}

class _IconReferencePageState extends State<IconReferencePage> {
  bool _hasPrinted = false;

  @override
  Widget build(BuildContext context) {
    // 只打印一次
    if (!_hasPrinted) {
      _hasPrinted = true;
      _printAllIconCodes();
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Flutter 图标对照表')),
      body: ListView(
        children: [
          const Padding(
            padding: EdgeInsets.all(16.0),
            child: Text(
              '常用图标及其码点',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
          ),
          _buildSection('餐饮类', [
            _IconItem('restaurant', Icons.restaurant, '餐饮'),
            _IconItem('free_breakfast', Icons.free_breakfast, '早餐'),
            _IconItem('breakfast_dining', Icons.breakfast_dining, '早餐用餐'),
            _IconItem('lunch_dining', Icons.lunch_dining, '午餐'),
            _IconItem('dinner_dining', Icons.dinner_dining, '晚餐'),
            _IconItem('local_cafe', Icons.local_cafe, '咖啡'),
            _IconItem('local_bar', Icons.local_bar, '酒吧'),
            _IconItem('fastfood', Icons.fastfood, '快餐'),
            _IconItem('restaurant_menu', Icons.restaurant_menu, '菜单'),
            _IconItem('ramen_dining', Icons.ramen_dining, '拉面'),
            _IconItem('set_meal', Icons.set_meal, '套餐'),
          ]),
          _buildSection('交通类', [
            _IconItem('directions_car', Icons.directions_car, '汽车'),
            _IconItem('directions_bus', Icons.directions_bus, '公交'),
            _IconItem('directions_transit', Icons.directions_transit, ' transit'),
            _IconItem('directions_bike', Icons.directions_bike, '自行车'),
            _IconItem('directions_walk', Icons.directions_walk, '步行'),
            _IconItem('local_taxi', Icons.local_taxi, '出租车'),
            _IconItem('flight', Icons.flight, '飞机'),
            _IconItem('train', Icons.train, '火车'),
            _IconItem('two_wheeler', Icons.two_wheeler, '两轮车'),
            _IconItem('electric_moped', Icons.electric_moped, '电动车'),
            _IconItem('pedal_bike', Icons.pedal_bike, '脚踏车'),
          ]),
          _buildSection('购物类', [
            _IconItem('shopping_cart', Icons.shopping_cart, '购物车'),
            _IconItem('shopping_basket', Icons.shopping_basket, '购物篮'),
            _IconItem('shopping_bag', Icons.shopping_bag, '购物袋'),
            _IconItem('checkroom', Icons.checkroom, '服饰'),
            _IconItem('store', Icons.store, '商店'),
            _IconItem('storefront', Icons.storefront, '店面'),
            _IconItem('local_mall', Icons.local_mall, '商场'),
            _IconItem('devices', Icons.devices, '设备'),
            _IconItem('weekend', Icons.weekend, '周末/家居'),
          ]),
          _buildSection('居住类', [
            _IconItem('home', Icons.home, '家'),
            _IconItem('home_work', Icons.home_work, '家和工作'),
            _IconItem('apartment', Icons.apartment, '公寓'),
            _IconItem('villa', Icons.villa, '别墅'),
            _IconItem('hotel', Icons.hotel, '酒店'),
            _IconItem('meeting_room', Icons.meeting_room, '会议室'),
            _IconItem('balcony', Icons.balcony, '阳台'),
            _IconItem('bathtub', Icons.bathtub, '浴缸'),
            _IconItem('kitchen', Icons.kitchen, '厨房'),
            _IconItem('chair', Icons.chair, '椅子'),
            _IconItem('table_restaurant', Icons.table_restaurant, '桌子'),
          ]),
          _buildSection('娱乐类', [
            _IconItem('movie', Icons.movie, '电影'),
            _IconItem('sports_esports', Icons.sports_esports, '电竞'),
            _IconItem('sports_basketball', Icons.sports_basketball, '篮球'),
            _IconItem('sports_soccer', Icons.sports_soccer, '足球'),
            _IconItem('sports', Icons.sports, '运动'),
            _IconItem('fitness_center', Icons.fitness_center, '健身'),
            _IconItem('theater_comedy', Icons.theater_comedy, '戏剧'),
            _IconItem('casino', Icons.casino, '赌场'),
            _IconItem('headphones', Icons.headphones, '耳机'),
            _IconItem('music_note', Icons.music_note, '音符'),
            _IconItem('videogame_asset', Icons.videogame_asset, '游戏'),
            _IconItem('landscape', Icons.landscape, '风景/旅游'),
          ]),
          _buildSection('医疗类', [
            _IconItem('local_hospital', Icons.local_hospital, '医院'),
            _IconItem('medication', Icons.medication, '药物'),
            _IconItem('medical_services', Icons.medical_services, '医疗服务'),
            _IconItem('healing', Icons.healing, '治疗'),
            _IconItem('health_and_safety', Icons.health_and_safety, '健康安全'),
            _IconItem('spa', Icons.spa, '水疗/保健品'),
            _IconItem('coronavirus', Icons.coronavirus, '病毒'),
            _IconItem('sick', Icons.sick, '生病'),
            _IconItem('psychology', Icons.psychology, '心理'),
            _IconItem('sanitizer', Icons.sanitizer, '消毒'),
          ]),
          _buildSection('教育类', [
            _IconItem('school', Icons.school, '学校'),
            _IconItem('menu_book', Icons.menu_book, '书籍'),
            _IconItem('auto_stories', Icons.auto_stories, '自动故事'),
            _IconItem('library_books', Icons.library_books, '图书馆'),
            _IconItem('cast_for_education', Icons.cast_for_education, '教育'),
            _IconItem('computer', Icons.computer, '电脑'),
            _IconItem('quiz', Icons.quiz, '测验/考试'),
            _IconItem('science', Icons.science, '科学'),
            _IconItem('calculate', Icons.calculate, '计算'),
            _IconItem('account_balance', Icons.account_balance, '银行/学费'),
          ]),
          _buildSection('通讯类', [
            _IconItem('phone', Icons.phone, '电话'),
            _IconItem('phone_iphone', Icons.phone_iphone, 'iPhone'),
            _IconItem('email', Icons.email, '邮件'),
            _IconItem('chat', Icons.chat, '聊天'),
            _IconItem('router', Icons.router, '路由器'),
            _IconItem('network_check', Icons.network_check, '网络检查'),
            _IconItem('local_post_office', Icons.local_post_office, '邮局'),
            _IconItem('contact_mail', Icons.contact_mail, '联系邮件'),
            _IconItem('message', Icons.message, '消息'),
            _IconItem('sms', Icons.sms, '短信'),
          ]),
          _buildSection('金融/工资类', [
            _IconItem('payments', Icons.payments, '支付/工资'),
            _IconItem('account_balance_wallet', Icons.account_balance_wallet, '钱包'),
            _IconItem('attach_money', Icons.attach_money, '钱'),
            _IconItem('savings', Icons.savings, '储蓄'),
            _IconItem('trending_up', Icons.trending_up, '上涨/绩效'),
            _IconItem('stars', Icons.stars, '星星/奖金'),
            _IconItem('emoji_events', Icons.emoji_events, '奖杯/年终奖'),
            _IconItem('show_chart', Icons.show_chart, '图表/投资'),
            _IconItem('monetization_on', Icons.monetization_on, '货币'),
            _IconItem('currency_bitcoin', Icons.currency_bitcoin, '比特币/数字货币'),
            _IconItem('credit_card', Icons.credit_card, '信用卡'),
          ]),
          _buildSection('人情/礼物类', [
            _IconItem('card_giftcard', Icons.card_giftcard, '礼品卡/红包'),
            _IconItem('redeem', Icons.redeem, '兑换/礼品'),
            _IconItem('favorite', Icons.favorite, '爱心/孝敬'),
            _IconItem('favorite_border', Icons.favorite_border, '爱心边框'),
            _IconItem('celebration', Icons.celebration, '庆祝/节日'),
            _IconItem('volunteer_activism', Icons.volunteer_activism, '志愿/请客'),
            _IconItem('cake', Icons.cake, '蛋糕/生日'),
          ]),
          _buildSection('其他常用', [
            _IconItem('category', Icons.category, '分类'),
            _IconItem('apps', Icons.apps, '应用'),
            _IconItem('work', Icons.work, '工作/兼职'),
            _IconItem('support_agent', Icons.support_agent, '客服/咨询'),
            _IconItem('handyman', Icons.handyman, '维修/工具'),
            _IconItem('construction', Icons.construction, '施工'),
            _IconItem('build', Icons.build, '构建'),
            _IconItem('receipt_long', Icons.receipt_long, '收据/物业费'),
            _IconItem('wifi', Icons.wifi, 'WiFi/网费'),
            _IconItem('water_drop', Icons.water_drop, '水滴/水电'),
            _IconItem('assignment', Icons.assignment, '任务/挂号'),
          ]),
        ],
      ),
    );
  }

  static Widget _buildSection(String title, List<_IconItem> items) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const Divider(),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: items,
            ),
          ],
        ),
      ),
    );
  }

  void _printAllIconCodes() {
    debugPrint('========== Material Icons Code Points ==========');

    // 餐饮类
    debugPrint('餐饮: 0x${Icons.restaurant.codePoint.toRadixString(16)}');
    debugPrint('早餐: 0x${Icons.free_breakfast.codePoint.toRadixString(16)}');
    debugPrint('午餐: 0x${Icons.lunch_dining.codePoint.toRadixString(16)}');
    debugPrint('晚餐: 0x${Icons.dinner_dining.codePoint.toRadixString(16)}');
    debugPrint('零食: 0x${Icons.fastfood.codePoint.toRadixString(16)}');
    debugPrint('饮料: 0x${Icons.local_cafe.codePoint.toRadixString(16)}');

    // 交通类
    debugPrint('交通: 0x${Icons.directions_car.codePoint.toRadixString(16)}');
    debugPrint('公交地铁: 0x${Icons.directions_transit.codePoint.toRadixString(16)}');
    debugPrint('打车: 0x${Icons.local_taxi.codePoint.toRadixString(16)}');
    debugPrint('火车飞机: 0x${Icons.flight.codePoint.toRadixString(16)}');
    debugPrint('共享单车: 0x${Icons.pedal_bike.codePoint.toRadixString(16)}');

    // 购物类
    debugPrint('购物: 0x${Icons.shopping_cart.codePoint.toRadixString(16)}');
    debugPrint('日用品: 0x${Icons.checkroom.codePoint.toRadixString(16)}');
    debugPrint('服饰: 0x${Icons.shopping_bag.codePoint.toRadixString(16)}');
    debugPrint('数码产品: 0x${Icons.devices.codePoint.toRadixString(16)}');
    debugPrint('家居: 0x${Icons.weekend.codePoint.toRadixString(16)}');
    debugPrint('美容: 0x${Icons.face.codePoint.toRadixString(16)}');

    // 居住类
    debugPrint('居住: 0x${Icons.home.codePoint.toRadixString(16)}');
    debugPrint('房租: 0x${Icons.attach_money.codePoint.toRadixString(16)}');
    debugPrint('水电煤气: 0x${Icons.lightbulb.codePoint.toRadixString(16)}');
    debugPrint('网费: 0x${Icons.wifi.codePoint.toRadixString(16)}');
    debugPrint('维修: 0x${Icons.build.codePoint.toRadixString(16)}');

    // 娱乐类
    debugPrint('娱乐: 0x${Icons.theater_comedy.codePoint.toRadixString(16)}');
    debugPrint('电影: 0x${Icons.movie.codePoint.toRadixString(16)}');
    debugPrint('游戏: 0x${Icons.sports_esports.codePoint.toRadixString(16)}');
    debugPrint('KTV: 0x${Icons.mic.codePoint.toRadixString(16)}');
    debugPrint('运动: 0x${Icons.fitness_center.codePoint.toRadixString(16)}');
    debugPrint('旅游: 0x${Icons.flight_takeoff.codePoint.toRadixString(16)}');

    // 医疗类
    debugPrint('医疗: 0x${Icons.local_hospital.codePoint.toRadixString(16)}');
    debugPrint('药品: 0x${Icons.medication.codePoint.toRadixString(16)}');
    debugPrint('挂号: 0x${Icons.local_hospital.codePoint.toRadixString(16)}');
    debugPrint('体检: 0x${Icons.health_and_safety.codePoint.toRadixString(16)}');
    debugPrint('保健品: 0x${Icons.local_pharmacy.codePoint.toRadixString(16)}');
    debugPrint('保险: 0x${Icons.savings.codePoint.toRadixString(16)}');

    // 教育类
    debugPrint('教育: 0x${Icons.school.codePoint.toRadixString(16)}');
    debugPrint('学费: 0x${Icons.payments.codePoint.toRadixString(16)}');
    debugPrint('书籍: 0x${Icons.menu_book.codePoint.toRadixString(16)}');
    debugPrint('培训: 0x${Icons.cast_for_education.codePoint.toRadixString(16)}');
    debugPrint('在线课程: 0x${Icons.online_prediction.codePoint.toRadixString(16)}');
    debugPrint('考试: 0x${Icons.quiz.codePoint.toRadixString(16)}');

    // 通讯类
    debugPrint('通讯: 0x${Icons.phone.codePoint.toRadixString(16)}');
    debugPrint('话费: 0x${Icons.phone_in_talk.codePoint.toRadixString(16)}');
    debugPrint('流量: 0x${Icons.network_check.codePoint.toRadixString(16)}');
    debugPrint('宽带: 0x${Icons.wifi.codePoint.toRadixString(16)}');
    debugPrint('邮寄: 0x${Icons.local_shipping.codePoint.toRadixString(16)}');

    // 人情类
    debugPrint('人情: 0x${Icons.volunteer_activism.codePoint.toRadixString(16)}');
    debugPrint('红包: 0x${Icons.card_giftcard.codePoint.toRadixString(16)}');
    debugPrint('礼品: 0x${Icons.card_giftcard.codePoint.toRadixString(16)}');
    debugPrint('孝敬: 0x${Icons.favorite.codePoint.toRadixString(16)}');
    debugPrint('其他支出: 0x${Icons.category.codePoint.toRadixString(16)}');

    // 收入类
    debugPrint('工资: 0x${Icons.attach_money.codePoint.toRadixString(16)}');
    debugPrint('基本工资: 0x${Icons.payments.codePoint.toRadixString(16)}');
    debugPrint('绩效奖金: 0x${Icons.money.codePoint.toRadixString(16)}');
    debugPrint('补贴: 0x${Icons.savings.codePoint.toRadixString(16)}');
    debugPrint('奖金: 0x${Icons.stars.codePoint.toRadixString(16)}');
    debugPrint('年终奖: 0x${Icons.card_giftcard.codePoint.toRadixString(16)}');
    debugPrint('项目奖金: 0x${Icons.work.codePoint.toRadixString(16)}');
    debugPrint('提成: 0x${Icons.trending_up.codePoint.toRadixString(16)}');

    debugPrint('投资收益: 0x${Icons.show_chart.codePoint.toRadixString(16)}');
    debugPrint('股票: 0x${Icons.show_chart.codePoint.toRadixString(16)}');
    debugPrint('基金: 0x${Icons.account_balance.codePoint.toRadixString(16)}');
    debugPrint('利息: 0x${Icons.savings.codePoint.toRadixString(16)}');
    debugPrint('数字货币: 0x${Icons.currency_bitcoin.codePoint.toRadixString(16)}');

    debugPrint('兼职: 0x${Icons.work.codePoint.toRadixString(16)}');
    debugPrint('外包: 0x${Icons.business_center.codePoint.toRadixString(16)}');
    debugPrint('打零工: 0x${Icons.work.codePoint.toRadixString(16)}');
    debugPrint('咨询: 0x${Icons.support_agent.codePoint.toRadixString(16)}');

    debugPrint('礼金: 0x${Icons.card_giftcard.codePoint.toRadixString(16)}');
    debugPrint('生日礼金: 0x${Icons.cake.codePoint.toRadixString(16)}');
    debugPrint('节日礼金: 0x${Icons.celebration.codePoint.toRadixString(16)}');
    debugPrint('婚礼礼金: 0x${Icons.favorite.codePoint.toRadixString(16)}');
    debugPrint('其他收入: 0x${Icons.category.codePoint.toRadixString(16)}');

    debugPrint('============================================');
  }
}

class _IconItem extends StatelessWidget {
  final String iconName;
  final IconData icon;
  final String description;

  const _IconItem(this.iconName, this.icon, this.description);

  @override
  Widget build(BuildContext context) {
    final codePoint = icon.codePoint.toRadixString(16);

    // 打印所有图标码点到控制台
    debugPrint('Icon: $description (${iconName}) = 0x$codePoint');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 32),
          const SizedBox(height: 4),
          Text(
            description,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
          ),
          Text(
            iconName,
            style: TextStyle(fontSize: 10, color: Colors.grey.shade700),
          ),
          Text(
            '0x$codePoint',
            style: TextStyle(
              fontSize: 10,
              color: Colors.blue.shade700,
              fontFamily: 'monospace',
            ),
          ),
        ],
      ),
    );
  }
}

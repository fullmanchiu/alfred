import 'package:flutter/material.dart';
import 'dart:io';

void main() {
  print('=== Material Icons Code Points ===\n');

  // 餐饮类
  print('餐饮: ${Icons.restaurant.codePoint.toRadixString(16)}');
  print('早餐: ${Icons.free_breakfast.codePoint.toRadixString(16)}');
  print('午餐: ${Icons.lunch_dining.codePoint.toRadixString(16)}');
  print('晚餐: ${Icons.dinner_dining.codePoint.toRadixString(16)}');
  print('零食: ${Icons.fastfood.codePoint.toRadixString(16)}');
  print('饮料: ${Icons.local_cafe.codePoint.toRadixString(16)}');

  // 交通类
  print('\n交通: ${Icons.directions_car.codePoint.toRadixString(16)}');
  print('公交地铁: ${Icons.directions_transit.codePoint.toRadixString(16)}');
  print('打车: ${Icons.local_taxi.codePoint.toRadixString(16)}');
  print('私家车: ${Icons.directions_car.codePoint.toRadixString(16)}');
  print('火车飞机: ${Icons.flight.codePoint.toRadixString(16)}');
  print('共享单车: ${Icons.pedal_bike.codePoint.toRadixString(16)}');

  // 购物类
  print('\n购物: ${Icons.shopping_cart.codePoint.toRadixString(16)}');
  print('日用品: ${Icons.checkroom.codePoint.toRadixString(16)}');
  print('服饰: ${Icons.shopping_bag.codePoint.toRadixString(16)}');
  print('数码产品: ${Icons.devices.codePoint.toRadixString(16)}');
  print('家居: ${Icons.couch.codePoint.toRadixString(16)}');
  print('美容: ${Icons.face.codePoint.toRadixString(16)}');

  // 居住类
  print('\n居住: ${Icons.home.codePoint.toRadixString(16)}');
  print('房租: ${Icons.attach_money.codePoint.toRadixString(16)}');
  print('水电煤气: ${Icons.bolt.codePoint.toRadixString(16)}');
  print('物业费: ${Icons.receipt_long.codePoint.toRadixString(16)}');
  print('网费: ${Icons.wifi.codePoint.toRadixString(16)}');
  print('维修: ${Icons.handyman.codePoint.toRadixString(16)}');

  // 娱乐类
  print('\n娱乐: ${Icons.theater_comedy.codePoint.toRadixString(16)}');
  print('电影: ${Icons.movie.codePoint.toRadixString(16)}');
  print('游戏: ${Icons.sports_esports.codePoint.toRadixString(16)}');
  print('KTV: ${Icons.mic.codePoint.toRadixString(16)}');
  print('运动: ${Icons.fitness_center.codePoint.toRadixString(16)}');
  print('旅游: ${Icons.flight_takeoff.codePoint.toRadixString(16)}');

  // 医疗类
  print('\n医疗: ${Icons.local_hospital.codePoint.toRadixString(16)}');
  print('药品: ${Icons.medication.codePoint.toRadixString(16)}');
  print('挂号: ${Icons.medical_services.codePoint.toRadixString(16)}');
  print('体检: ${Icons.health_and_safety.codePoint.toRadixString(16)}');
  print('保健品: ${Icons.local_pharmacy.codePoint.toRadixString(16)}');
  print('保险: ${Icons.savings.codePoint.toRadixString(16)}');

  // 教育类
  print('\n教育: ${Icons.school.codePoint.toRadixString(16)}');
  print('学费: ${Icons.payments.codePoint.toRadixString(16)}');
  print('书籍: ${Icons.menu_book.codePoint.toRadixString(16)}');
  print('培训: ${Icons.cast_for_education.codePoint.toRadixString(16)}');
  print('在线课程: ${Icons.online_prediction.codePoint.toRadixString(16)}');
  print('考试: ${Icons.quiz.codePoint.toRadixString(16)}');

  // 通讯类
  print('\n通讯: ${Icons.phone.codePoint.toRadixString(16)}');
  print('话费: ${Icons.phone_in_talk.codePoint.toRadixString(16)}');
  print('流量: ${Icons.data_usage.codePoint.toRadixString(16)}');
  print('宽带: ${Icons.wifi.codePoint.toRadixString(16)}');
  print('邮寄: ${Icons.local_shipping.codePoint.toRadixString(16)}');

  // 人情类
  print('\n人情: ${Icons.volunteer_activism.codePoint.toRadixString(16)}');
  print('红包: ${Icons.card_giftcard.codePoint.toRadixString(16)}');
  print('请客: ${Icons.restaurant.codePoint.toRadixString(16)}');
  print('礼品: ${Icons.card_giftcard.codePoint.toRadixString(16)}');
  print('孝敬: ${Icons.favorite.codePoint.toRadixString(16)}');
  print('其他支出: ${Icons.category.codePoint.toRadixString(16)}');

  // 收入类
  print('\n工资: ${Icons.attach_money.codePoint.toRadixString(16)}');
  print('基本工资: ${Icons.payments.codePoint.toRadixString(16)}');
  print('绩效奖金: ${Icons.money.codePoint.toRadixString(16)}');
  print('补贴: ${Icons.savings.codePoint.toRadixString(16)}');
  print('奖金: ${Icons.stars.codePoint.toRadixString(16)}');
  print('年终奖: ${Icons.card_giftcard.codePoint.toRadixString(16)}');
  print('项目奖金: ${Icons.work.codePoint.toRadixString(16)}');
  print('提成: ${Icons.trending_up.codePoint.toRadixString(16)}');

  print('\n投资收益: ${Icons.show_chart.codePoint.toRadixString(16)}');
  print('股票: ${Icons.candlestick_chart.codePoint.toRadixString(16)}');
  print('基金: ${Icons.account_balance.codePoint.toRadixString(16)}');
  print('利息: ${Icons.savings.codePoint.toRadixString(16)}');
  print('数字货币: ${Icons.currency_bitcoin.codePoint.toRadixString(16)}');

  print('\n兼职: ${Icons.work.codePoint.toRadixString(16)}');
  print('外包: ${Icons.business_center.codePoint.toRadixString(16)}');
  print('打零工: ${Icons.handshake.codePoint.toRadixString(16)}');
  print('咨询: ${Icons.support_agent.codePoint.toRadixString(16)}');

  print('\n礼金: ${Icons.card_giftcard.codePoint.toRadixString(16)}');
  print('生日礼金: ${Icons.cake.codePoint.toRadixString(16)}');
  print('节日礼金: ${Icons.celebration.codePoint.toRadixString(16)}');
  print('婚礼礼金: ${Icons.favorite.codePoint.toRadixString(16)}');
  print('其他收入: ${Icons.category.codePoint.toRadixString(16)}');
}

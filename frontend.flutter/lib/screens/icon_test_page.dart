import 'package:flutter/material.dart';
import '../widgets/dynamic_icon.dart';

/// 图标测试页面 - 验证 Unicode 码点是否正确显示
/// 包含所有系统分类及其 icon 码点
class IconTestPage extends StatelessWidget {
  const IconTestPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('图标测试 - 系统分类')),
      body: ListView(
        children: [
          // 对比测试区域
          const Padding(
            padding: EdgeInsets.all(16.0),
            child: Text(
              '对比测试 - Flutter 内置 Icons vs DynamicIcon',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.purple),
            ),
          ),
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('餐饮图标对比', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.restaurant, size: 40, color: Colors.red),
                      const SizedBox(width: 20),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Flutter Icons.restaurant', style: TextStyle(fontWeight: FontWeight.bold)),
                            Text('码点: 0x${Icons.restaurant.codePoint.toRadixString(16)}',
                                style: const TextStyle(fontSize: 12, color: Colors.grey)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const Divider(),
                  Row(
                    children: [
                      DynamicIcon(iconCode: 'e56c', size: 40, color: '#FF0000'),
                      const SizedBox(width: 20),
                      const Text('DynamicIcon(e56c)\n配置文件中的码点'),
                    ],
                  ),
                  const Divider(),
                  Text(
                    'Flutter SDK 实际码点: 0x${Icons.restaurant.codePoint.toRadixString(16)}\n'
                    '配置文件中的码点: 0xe56c\n'
                    '匹配: ${Icons.restaurant.codePoint == int.parse('0xe56c') ? '✅ 是' : '❌ 否'}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Icons.restaurant.codePoint == int.parse('0xe56c') ? Colors.green : Colors.red,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text('如果 Flutter 内置图标正常显示，但 DynamicIcon 不显示，\n说明码点不匹配。需要更新配置文件中的码点。', style: TextStyle(fontSize: 11, color: Colors.orange)),
                ],
              ),
            ),
          ),
          const Divider(),

          const Padding(
            padding: EdgeInsets.all(16.0),
            child: Text(
              '支出分类',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.red),
            ),
          ),
          _buildCategory('餐饮', 'e56c', '#FF5722', subcategories: [
            _buildSub('早餐', 'eb44'),
            _buildSub('午餐', 'ea61'),
            _buildSub('晚餐', 'ea57'),
            _buildSub('零食', 'eaac'),
            _buildSub('饮料', 'e541'),
          ]),
          _buildCategory('交通', 'e531', '#2196F3', subcategories: [
            _buildSub('公交地铁', 'e535'),
            _buildSub('打车', 'e559'),
            _buildSub('私家车', 'e531'),
            _buildSub('火车飞机', 'e539'),
            _buildSub('共享单车', 'e52f'),
          ]),
          _buildCategory('购物', 'e8cc', '#9C27B0', subcategories: [
            _buildSub('日用品', 'e8cb'),
            _buildSub('服饰', 'f19e'),
            _buildSub('数码产品', 'e1b1'),
            _buildSub('家居', 'e16b'),
            _buildSub('美容', 'e87c'),
          ]),
          _buildCategory('居住', 'e88a', '#00BCD4', subcategories: [
            _buildSub('房租', 'ea40'),
            _buildSub('水电煤气', 'e798'),
            _buildSub('物业费', 'e8d3'),
            _buildSub('网费', 'e1e2'),
            _buildSub('维修', 'f10b'),
          ]),
          _buildCategory('娱乐', 'e02c', '#E91E63', subcategories: [
            _buildSub('电影', 'e02c'),
            _buildSub('游戏', 'ea28'),
            _buildSub('KTV', 'e029'),
            _buildSub('运动', 'ea26'),
            _buildSub('旅游', 'e407'),
          ]),
          _buildCategory('医疗', 'e548', '#F44336', subcategories: [
            _buildSub('药品', 'f033'),
            _buildSub('挂号', 'e85d'),
            _buildSub('体检', 'f109'),
            _buildSub('保健品', 'eb4c'),
            _buildSub('保险', 'e1d5'),
          ]),
          _buildCategory('教育', 'e80c', '#00BCD4', subcategories: [
            _buildSub('学费', 'e84f'),
            _buildSub('书籍', 'ea19'),
            _buildSub('培训', 'efec'),
            _buildSub('在线课程', 'e30a'),
            _buildSub('考试', 'f04c'),
          ]),
          _buildCategory('通讯', 'e0cd', '#2196F3', subcategories: [
            _buildSub('话费', 'e325'),
            _buildSub('流量', 'e640'),
            _buildSub('宽带', 'e328'),
            _buildSub('邮寄', 'e554'),
          ]),
          _buildCategory('人情', 'e8f6', '#FF9800', subcategories: [
            _buildSub('红包', 'e8f6'),
            _buildSub('请客', 'e87b'),
            _buildSub('礼品', 'e8b1'),
            _buildSub('孝敬', 'e87d'),
          ]),
          _buildCategory('其他支出', 'e574', '#9E9E9E'),

          const Padding(
            padding: EdgeInsets.all(16.0),
            child: Text(
              '收入分类',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.green),
            ),
          ),
          _buildCategory('工资', 'ef63', '#4CAF50', subcategories: [
            _buildSub('基本工资', 'e227'),
            _buildSub('绩效奖金', 'e8e5'),
            _buildSub('补贴', 'e850'),
          ]),
          _buildCategory('奖金', 'e8d0', '#FF9800', subcategories: [
            _buildSub('年终奖', 'f8d9'),
            _buildSub('项目奖金', 'ea23'),
            _buildSub('提成', 'e6e1'),
          ]),
          _buildCategory('投资收益', 'e8e5', '#009688', subcategories: [
            _buildSub('股票', 'e6e1'),
            _buildSub('基金', 'e166'),
            _buildSub('利息', 'e2eb'),
            _buildSub('数字货币', 'ebc5'),
          ]),
          _buildCategory('兼职', 'e8f9', '#795548', subcategories: [
            _buildSub('外包', 'e30a'),
            _buildSub('打零工', 'e21d'),
            _buildSub('咨询', 'f0e2'),
          ]),
          _buildCategory('礼金', 'e8f6', '#E91E63', subcategories: [
            _buildSub('生日礼金', 'e7e9'),
            _buildSub('节日礼金', 'ea65'),
            _buildSub('婚礼礼金', 'e87d'),
          ]),
          _buildCategory('其他收入', 'e574', '#9E9E9E'),
        ],
      ),
    );
  }

  /// 构建主分类
  static Widget _buildCategory(String name, String iconCode, String color, {List<Widget>? subcategories}) {
    final bgColor = _parseColor(color);
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                DynamicIcon(iconCode: iconCode, size: 32, color: color),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    name,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: bgColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: bgColor, width: 1),
                  ),
                  child: Text(
                    iconCode,
                    style: TextStyle(
                      fontSize: 12,
                      color: bgColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            if (subcategories != null && subcategories.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Divider(),
              const Padding(
                padding: EdgeInsets.only(bottom: 8.0),
                child: Text(
                  '子分类：',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                ),
              ),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: subcategories,
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// 构建子分类
  static Widget _buildSub(String name, String iconCode) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          DynamicIcon(iconCode: iconCode, size: 20, color: '#666666'),
          const SizedBox(width: 6),
          Text(
            name,
            style: const TextStyle(fontSize: 13),
          ),
          const SizedBox(width: 6),
          Text(
            iconCode,
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey.shade600,
              fontFamily: 'monospace',
            ),
          ),
        ],
      ),
    );
  }

  /// 解析颜色字符串
  static Color _parseColor(String colorString) {
    final buffer = StringBuffer();
    if (colorString.startsWith('#')) {
      buffer.write(colorString.substring(1));
    } else {
      buffer.write(colorString);
    }
    return Color(int.parse(buffer.toString(), radix: 16) + 0xFF000000);
  }
}

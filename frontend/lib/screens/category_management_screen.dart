import 'package:flutter/material.dart';
import '../models/category_model.dart';
import '../services/api_service.dart';
import '../components/app_header.dart';
import '../utils/auth_helper.dart';

class CategoryManagementScreen extends StatefulWidget {
  const CategoryManagementScreen({super.key});

  @override
  State<CategoryManagementScreen> createState() => _CategoryManagementScreenState();
}

class _CategoryManagementScreenState extends State<CategoryManagementScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  List<Category> _categories = [];
  bool _isLoading = true;
  String? _errorMessage;
  bool _isEditMode = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (_tabController.indexIsChanging) {
        _loadCategories();
      }
    });
    _loadCategories();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _toggleEditMode() {
    setState(() => _isEditMode = !_isEditMode);
  }

  Future<void> _loadCategories() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final type = _tabController.index == 0 ? 'income' : 'expense';
      final data = await ApiService.getCategories(type: type);
      final List<dynamic> categoryList = data['categories'] ?? [];

      if (mounted) {
        setState(() {
          _categories = categoryList
              .map((json) => Category.fromJson(json))
              .toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _showAddCategoryDialog() async {
    // 检查登录状态
    final isLoggedIn = await AuthHelper.checkLogin(context);
    if (!isLoggedIn) {
      return;
    }

    if (!mounted) return;

    final type = _tabController.index == 0 ? 'income' : 'expense';
    showDialog(
      context: context,
      builder: (context) => AddCategoryDialog(
        categoryType: type,
        parentCategories: _categories.where((c) => c.parentId == null).toList(),
        onCategorySaved: () {
          _loadCategories();
        },
      ),
    );
  }

  void _showEditCategoryDialog(Category category) {
    final type = _tabController.index == 0 ? 'income' : 'expense';
    showDialog(
      context: context,
      builder: (context) => AddCategoryDialog(
        category: category,
        categoryType: type,
        parentCategories: _categories.where((c) => c.parentId == null && c.id != category.id).toList(),
        onCategorySaved: () {
          _loadCategories();
        },
      ),
    );
  }

  Future<void> _handleDeleteCategory(Category category) async {
    // System categories cannot be deleted
    if (category.isDefault) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('系统默认分类不能删除'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('确认删除'),
        content: Text('确定要删除分类"${category.name}"吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('删除'),
          ),
        ],
      ),
    );

    if (confirmed == true && category.id != null) {
      try {
        await ApiService.deleteCategory(category.id!);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('分类删除成功'),
              backgroundColor: Colors.green,
            ),
          );
          _loadCategories();
        }
      } catch (e) {
        // 先检查是否是认证错误，如果是会自动跳转到登录页
        await AuthHelper.handleAuthError(
          context,
          e,
          customMessage: '登录已过期，请重新登录后删除分类',
        );

        // 如果不是认证错误，显示通用错误信息
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('删除失败：$e'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  // 拖拽排序 - 顶级分类
  void _onParentReorder(int oldIndex, int newIndex) async {
    setState(() {
      if (newIndex > oldIndex) {
        newIndex -= 1;
      }
      final Category category = _categories.removeAt(oldIndex);
      _categories.insert(newIndex, category);
    });
    
    await _updateCategoryOrder();
  }

  // 拖拽排序 - 子分类
  void _onSubcategoryReorder(Category parent, int oldIndex, int newIndex) async {
    final subcategories = parent.subcategories ?? [];
    if (subcategories.isEmpty) return;
    
    setState(() {
      if (newIndex > oldIndex) {
        newIndex -= 1;
      }
      final Category category = subcategories.removeAt(oldIndex);
      subcategories.insert(newIndex, category);
    });
    
    await _updateSubcategoryOrder(parent);
  }

  // 更新分类顺序
  Future<void> _updateCategoryOrder() async {
    try {
      for (int i = 0; i < _categories.length; i++) {
        final category = _categories[i];
        if (category.id != null) {
          await ApiService.updateCategory(category.id!, {
            'sort_order': i,
          });
        }
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('排序已更新'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 1),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('更新排序失败：$e'),
            backgroundColor: Colors.red,
          ),
        );
        // 重新加载数据
        _loadCategories();
      }
    }
  }

  // 更新子分类顺序
  Future<void> _updateSubcategoryOrder(Category parent) async {
    final subcategories = parent.subcategories ?? [];
    try {
      for (int i = 0; i < subcategories.length; i++) {
        final category = subcategories[i];
        if (category.id != null) {
          await ApiService.updateCategory(category.id!, {
            'sort_order': i,
          });
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('更新子分类排序失败：$e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      body: Column(
        children: [
          AppHeader(
            title: '分类管理',
            actions: [
              IconButton(
                icon: Icon(_isEditMode ? Icons.done : Icons.edit),
                onPressed: _toggleEditMode,
                tooltip: _isEditMode ? '完成编辑' : '编辑排序',
                color: _isEditMode ? Colors.blue : Colors.grey[600],
              ),
            ],
          ),
          TabBar(
            controller: _tabController,
            labelColor: Colors.blue,
            unselectedLabelColor: Colors.grey[600],
            indicatorColor: Colors.blue,
            tabs: const [
              Tab(
                icon: Icon(Icons.arrow_downward),
                text: '收入分类',
              ),
              Tab(
                icon: Icon(Icons.arrow_upward),
                text: '支出分类',
              ),
            ],
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _errorMessage != null
                    ? _buildErrorView()
                    : _buildCategoryListView(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddCategoryDialog,
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('添加分类'),
      ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          Text(
            _errorMessage ?? '加载失败',
            style: const TextStyle(fontSize: 16, color: Colors.red),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _loadCategories,
            child: const Text('重试'),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryListView() {
    if (_categories.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.category, size: 80, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              '暂无分类',
              style: TextStyle(fontSize: 18, color: Colors.grey[600]),
            ),
            const SizedBox(height: 8),
            Text(
              '点击下方按钮添加第一个分类',
              style: TextStyle(fontSize: 14, color: Colors.grey[500]),
            ),
          ],
        ),
      );
    }

    if (_isEditMode) {
      // 编辑模式：使用 ReorderableListView
      return ReorderableListView(
        onReorder: _onParentReorder,
        padding: const EdgeInsets.all(16),
        children: _categories
            .where((c) => c.parentId == null)
            .map((category) => _buildEditableParentCategoryCard(category))
            .toList(),
      );
    } else {
      // 普通模式：使用普通 ListView
      return RefreshIndicator(
        onRefresh: _loadCategories,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: _categories.map((category) {
            // Use subcategories from model if available
            final hasSubcategories = category.subcategories != null && 
                                    category.subcategories!.isNotEmpty;

            if (category.parentId == null) {
              // Parent category
              return _buildParentCategoryCard(category);
            } else {
              // Skip subcategories here, they'll be shown in parent's expansion
              return const SizedBox.shrink();
            }
          }).toList(),
        ),
      );
    }
  }

  Widget _buildEditableParentCategoryCard(Category category) {
    return ReorderableDelayedDragStartListener(
      key: ValueKey(category.id),
      index: _categories.indexOf(category),
      child: Card(
        margin: const EdgeInsets.only(bottom: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        elevation: 2,
        child: ListTile(
          leading: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: _getCategoryColor(category.color).withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              _getIconData(category.icon),
              color: _getCategoryColor(category.color),
              size: 24,
            ),
          ),
          title: Row(
            children: [
              Text(
                category.name ?? '',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (category.isDefault) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.orange[100],
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '系统',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.orange[700],
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ],
          ),
          trailing: const Icon(Icons.drag_handle, color: Colors.grey),
        ),
      ),
    );
  }

  Widget _buildParentCategoryCard(Category category) {
    // Get subcategories from model
    final subcategories = category.subcategories ?? [];
    final hasSubcategories = subcategories.isNotEmpty;
    final isSystem = category.isDefault;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 2,
      child: hasSubcategories
          ? ExpansionTile(
              leading: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: _getCategoryColor(category.color).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _getIconData(category.icon),
                  color: _getCategoryColor(category.color),
                  size: 24,
                ),
              ),
              title: Row(
                children: [
                  Text(
                    category.name ?? '',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (isSystem) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.orange[100],
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '系统',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.orange[700],
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              subtitle: subcategories.isNotEmpty
                  ? Text('${subcategories.length} 个子分类')
                  : null,
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.edit, size: 20),
                    onPressed: () => _showEditCategoryDialog(category),
                    tooltip: '编辑',
                  ),
                  if (!isSystem)
                    IconButton(
                      icon: const Icon(Icons.delete, size: 20),
                      onPressed: () => _handleDeleteCategory(category),
                      tooltip: '删除',
                    ),
                ],
              ),
              tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              children: [
                ...subcategories.map((sub) => Padding(
                      padding: const EdgeInsets.only(left: 16, right: 16, bottom: 8),
                      child: _buildSubcategoryTile(sub),
                    )),
              ],
            )
          : ListTile(
              leading: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: _getCategoryColor(category.color).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _getIconData(category.icon),
                  color: _getCategoryColor(category.color),
                  size: 24,
                ),
              ),
              title: Row(
                children: [
                  Text(
                    category.name ?? '',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (isSystem) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.orange[100],
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '系统',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.orange[700],
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.edit, size: 20),
                    onPressed: () => _showEditCategoryDialog(category),
                    tooltip: '编辑',
                  ),
                  if (!isSystem)
                    IconButton(
                      icon: const Icon(Icons.delete, size: 20),
                      onPressed: () => _handleDeleteCategory(category),
                      tooltip: '删除',
                    ),
                ],
              ),
            ),
    );
  }

  Widget _buildSubcategoryTile(Category category) {
    final isSystem = category.isDefault;

    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 1,
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: _getCategoryColor(category.color).withOpacity(0.15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            _getIconData(category.icon),
            color: _getCategoryColor(category.color),
            size: 20,
          ),
        ),
        title: Row(
          children: [
            Text(
              category.name ?? '',
              style: const TextStyle(fontSize: 15),
            ),
            if (isSystem) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: Colors.orange[100],
                  borderRadius: BorderRadius.circular(3),
                ),
                child: Text(
                  '系统',
                  style: TextStyle(
                    fontSize: 10,
                    color: Colors.orange[700],
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.edit, size: 18),
              onPressed: () => _showEditCategoryDialog(category),
              tooltip: '编辑',
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
              visualDensity: VisualDensity.compact,
            ),
            if (!isSystem) ...[
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.delete, size: 18),
                onPressed: () => _handleDeleteCategory(category),
                tooltip: '删除',
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                visualDensity: VisualDensity.compact,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Color _getCategoryColor(String? colorHex) {
    if (colorHex == null || colorHex.isEmpty) return Colors.grey;
    try {
      return Color(int.parse(colorHex.substring(1), radix: 16) + 0xFF000000);
    } catch (e) {
      return Colors.grey;
    }
  }

  IconData _getIconData(String? iconName) {
    // 统一的图标映射表，支持前后端多种图标名称
    // 餐饮类
    if (['food', 'restaurant', 'fastfood', 'breakfast', 'lunch', 'dinner',
         'restaurant_menu', 'local_dining', 'local_cafe', 'set_meal',
         'breakfast_dining', 'dinner_dining', 'liquor'].contains(iconName)) {
      return Icons.restaurant;
    }
    
    // 交通类
    if (['transport', 'bus', 'directions_bus', 'subway', 'metro', 'train',
         'car', 'taxi', 'directions_car', 'local_taxi', 'local_shipping',
         'two_wheeler', 'electric_moped', 'pedal_bike'].contains(iconName)) {
      return Icons.directions_car;
    }
    if (iconName == 'flight') return Icons.flight;
    
    // 购物类
    if (['shopping', 'shopping_cart', 'store', 'mall', 'shopping_bag'].contains(iconName)) {
      return Icons.shopping_cart;
    }
    
    // 居住类
    if (['home', 'house', 'rent', 'hotel'].contains(iconName)) {
      return Icons.home;
    }
    if (iconName == 'home_work') return Icons.home_work;
    
    // 娱乐类
    if (['entertainment', 'movie', 'film', 'theater', 'cinema'].contains(iconName)) {
      return Icons.movie;
    }
    if (['game', 'gaming', 'sports_esports', 'casino'].contains(iconName)) {
      return Icons.sports_esports;
    }
    if (['music', 'audio', 'song'].contains(iconName)) {
      return Icons.music_note;
    }
    if (['travel', 'vacation', 'trip'].contains(iconName)) {
      return Icons.flight;
    }
    
    // 医疗类
    if (['medical', 'hospital', 'health', 'doctor'].contains(iconName)) {
      return Icons.local_hospital;
    }
    if (['drugstore', 'pharmacy', 'medication', 'pill'].contains(iconName)) {
      return Icons.medication;
    }
    
    // 教育类
    if (['education', 'school', 'teach', 'learn'].contains(iconName)) {
      return Icons.school;
    }
    if (['book', 'library', 'reading'].contains(iconName)) {
      return Icons.menu_book;
    }
    if (['science', 'lab'].contains(iconName)) {
      return Icons.science;
    }
    
    // 通讯类
    if (['phone', 'mobile', 'cellphone'].contains(iconName)) {
      return Icons.phone;
    }
    if (['internet', 'wifi', 'network'].contains(iconName)) {
      return Icons.wifi;
    }
    if (['bill', 'receipt'].contains(iconName)) {
      return Icons.receipt_long;
    }
    
    // 金融类
    if (['salary', 'income', 'wage'].contains(iconName)) {
      return Icons.attach_money;
    }
    if (['bonus', 'reward', 'prize'].contains(iconName)) {
      return Icons.card_giftcard;
    }
    if (['investment', 'stock', 'finance'].contains(iconName)) {
      return Icons.trending_up;
    }
    if (['bank', 'account', 'account_balance', 'account_balance_wallet'].contains(iconName)) {
      return Icons.account_balance;
    }
    if (['credit_card', 'card', 'payment'].contains(iconName)) {
      return Icons.credit_card;
    }
    
    // 生活类
    if (['clean', 'cleaning_services', 'cleaning'].contains(iconName)) {
      return Icons.cleaning_services;
    }
    if (['laundry', 'wash'].contains(iconName)) {
      return Icons.local_laundry_service;
    }
    if (['iron', 'ironing'].contains(iconName)) {
      return Icons.iron;
    }
    
    // 其他
    if (['social', 'gift', 'present'].contains(iconName)) {
      return Icons.card_giftcard;
    }
    if (['other', 'misc', 'category', 'more'].contains(iconName)) {
      return Icons.category;
    }
    if (['part_time', 'parttime', 'work', 'job', 'office'].contains(iconName)) {
      return Icons.work;
    }
    if (['pet', 'pets', 'animal'].contains(iconName)) {
      return Icons.pets;
    }
    if (['baby', 'child', 'child_care'].contains(iconName)) {
      return Icons.child_care;
    }
    if (['fitness', 'sport', 'gym', 'fitness_center'].contains(iconName)) {
      return Icons.fitness_center;
    }
    if (['spa', 'massage', 'beauty'].contains(iconName)) {
      return Icons.spa;
    }
    
    // 如果 iconName 为 null 或空字符串，返回默认图标
    if (iconName == null || iconName.isEmpty) {
      return Icons.category;
    }
    
    // 返回默认图标
    return Icons.category;
  }
}

// Add/Edit Category Dialog
class AddCategoryDialog extends StatefulWidget {
  final Category? category;
  final String categoryType;
  final List<Category> parentCategories;
  final VoidCallback? onCategorySaved;

  const AddCategoryDialog({
    super.key,
    this.category,
    required this.categoryType,
    required this.parentCategories,
    this.onCategorySaved,
  });

  @override
  State<AddCategoryDialog> createState() => _AddCategoryDialogState();
}

class _AddCategoryDialogState extends State<AddCategoryDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();

  String? _selectedIcon;
  String? _selectedColor;
  Category? _selectedParent;
  bool _isLoading = false;

  // 图标分组
  final List<Map<String, dynamic>> _iconGroups = [
    {
      'name': '餐饮',
      'icons': [
        {'name': 'restaurant', 'icon': Icons.restaurant},
        {'name': 'restaurant_menu', 'icon': Icons.restaurant_menu},
        {'name': 'fastfood', 'icon': Icons.fastfood},
        {'name': 'local_dining', 'icon': Icons.local_dining},
        {'name': 'local_cafe', 'icon': Icons.local_cafe},
        {'name': 'local_bar', 'icon': Icons.local_bar},
        {'name': 'cake', 'icon': Icons.cake},
        {'name': 'icecream', 'icon': Icons.icecream},
        {'name': 'breakfast_dining', 'icon': Icons.breakfast_dining},
        {'name': 'dinner_dining', 'icon': Icons.dinner_dining},
        {'name': 'liquor', 'icon': Icons.liquor},
        {'name': 'set_meal', 'icon': Icons.set_meal},
        {'name': 'ramen_dining', 'icon': Icons.ramen_dining},
      ]
    },
    {
      'name': '交通',
      'icons': [
        {'name': 'directions_car', 'icon': Icons.directions_car},
        {'name': 'directions_bus', 'icon': Icons.directions_bus},
        {'name': 'subway', 'icon': Icons.subway},
        {'name': 'train', 'icon': Icons.train},
        {'name': 'flight', 'icon': Icons.flight},
        {'name': 'local_taxi', 'icon': Icons.local_taxi},
        {'name': 'local_shipping', 'icon': Icons.local_shipping},
        {'name': 'two_wheeler', 'icon': Icons.two_wheeler},
        {'name': 'electric_moped', 'icon': Icons.electric_moped},
        {'name': 'pedal_bike', 'icon': Icons.pedal_bike},
        {'name': 'directions_bike', 'icon': Icons.directions_bike},
        {'name': 'airport_shuttle', 'icon': Icons.airport_shuttle},
      ]
    },
    {
      'name': '购物',
      'icons': [
        {'name': 'shopping_cart', 'icon': Icons.shopping_cart},
        {'name': 'shopping_bag', 'icon': Icons.shopping_bag},
        {'name': 'store', 'icon': Icons.store},
        {'name': 'storefront', 'icon': Icons.storefront},
        {'name': 'local_mall', 'icon': Icons.local_mall},
        {'name': 'checkroom', 'icon': Icons.checkroom},
        {'name': 'shopping_basket', 'icon': Icons.shopping_basket},
      ]
    },
    {
      'name': '居住',
      'icons': [
        {'name': 'home', 'icon': Icons.home},
        {'name': 'home_work', 'icon': Icons.home_work},
        {'name': 'hotel', 'icon': Icons.hotel},
        {'name': 'apartment', 'icon': Icons.apartment},
        {'name': 'villa', 'icon': Icons.villa},
        {'name': 'chalet', 'icon': Icons.chalet},
        {'name': 'cottage', 'icon': Icons.cottage},
      ]
    },
    {
      'name': '娱乐',
      'icons': [
        {'name': 'movie', 'icon': Icons.movie},
        {'name': 'movie_filter', 'icon': Icons.movie_filter},
        {'name': 'music_note', 'icon': Icons.music_note},
        {'name': 'sports_esports', 'icon': Icons.sports_esports},
        {'name': 'theater_comedy', 'icon': Icons.theater_comedy},
        {'name': 'casino', 'icon': Icons.casino},
        {'name': 'headphones', 'icon': Icons.headphones},
        {'name': 'videogame_asset', 'icon': Icons.videogame_asset},
      ]
    },
    {
      'name': '医疗',
      'icons': [
        {'name': 'local_hospital', 'icon': Icons.local_hospital},
        {'name': 'medical_services', 'icon': Icons.medical_services},
        {'name': 'medication', 'icon': Icons.medication},
        {'name': 'healing', 'icon': Icons.healing},
        {'name': 'health_and_safety', 'icon': Icons.health_and_safety},
        {'name': 'coronavirus', 'icon': Icons.coronavirus},
      ]
    },
    {
      'name': '教育',
      'icons': [
        {'name': 'school', 'icon': Icons.school},
        {'name': 'menu_book', 'icon': Icons.menu_book},
        {'name': 'science', 'icon': Icons.science},
        {'name': 'calculate', 'icon': Icons.calculate},
        {'name': 'psychology', 'icon': Icons.psychology},
        {'name': 'auto_stories', 'icon': Icons.auto_stories},
        {'name': 'library_books', 'icon': Icons.library_books},
      ]
    },
    {
      'name': '通讯',
      'icons': [
        {'name': 'phone', 'icon': Icons.phone},
        {'name': 'email', 'icon': Icons.email},
        {'name': 'chat', 'icon': Icons.chat},
        {'name': 'wifi', 'icon': Icons.wifi},
        {'name': 'broadcast_on_personal', 'icon': Icons.broadcast_on_personal},
        {'name': 'send', 'icon': Icons.send},
        {'name': 'mark_email_read', 'icon': Icons.mark_email_read},
      ]
    },
    {
      'name': '金融',
      'icons': [
        {'name': 'attach_money', 'icon': Icons.attach_money},
        {'name': 'account_balance', 'icon': Icons.account_balance},
        {'name': 'account_balance_wallet', 'icon': Icons.account_balance_wallet},
        {'name': 'credit_card', 'icon': Icons.credit_card},
        {'name': 'trending_up', 'icon': Icons.trending_up},
        {'name': 'savings', 'icon': Icons.savings},
        {'name': 'currency_exchange', 'icon': Icons.currency_exchange},
      ]
    },
    {
      'name': '生活',
      'icons': [
        {'name': 'cleaning_services', 'icon': Icons.cleaning_services},
        {'name': 'local_laundry_service', 'icon': Icons.local_laundry_service},
        {'name': 'iron', 'icon': Icons.iron},
        {'name': 'kitchen', 'icon': Icons.kitchen},
        {'name': 'weekend', 'icon': Icons.weekend},
        {'name': 'bakery_dining', 'icon': Icons.bakery_dining},
        {'name': 'tapas', 'icon': Icons.tapas},
      ]
    },
    {
      'name': '其他',
      'icons': [
        {'name': 'category', 'icon': Icons.category},
        {'name': 'work', 'icon': Icons.work},
        {'name': 'card_giftcard', 'icon': Icons.card_giftcard},
        {'name': 'pets', 'icon': Icons.pets},
        {'name': 'child_care', 'icon': Icons.child_care},
        {'name': 'fitness_center', 'icon': Icons.fitness_center},
        {'name': 'spa', 'icon': Icons.spa},
        {'name': 'celebration', 'icon': Icons.celebration},
        {'name': 'emoji_events', 'icon': Icons.emoji_events},
        {'name': 'volunteer_activism', 'icon': Icons.volunteer_activism},
      ]
    },
  ];

  // Available colors
  final List<String> _colorOptions = [
    '#FF5722', // Red
    '#2196F3', // Blue
    '#4CAF50', // Green
    '#FF9800', // Orange
    '#9C27B0', // Purple
    '#00BCD4', // Cyan
    '#F44336', // Red
    '#E91E63', // Pink
    '#3F51B5', // Indigo
    '#009688', // Teal
    '#795548', // Brown
    '#607D8B', // Blue Grey
  ];

  String _selectedGroup = '餐饮';

  @override
  void initState() {
    super.initState();

    if (widget.category != null) {
      // Edit mode: fill existing data
      _nameController.text = widget.category!.name ?? '';
      _selectedIcon = widget.category!.icon;
      _selectedColor = widget.category!.color;
      _selectedParent = widget.parentCategories
          .where((c) => c.id == widget.category!.parentId)
          .firstOrNull;
    } else {
      // Add mode: select defaults
      _selectedColor = _colorOptions[0];
      _selectedIcon = 'category';
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  Future<void> _saveCategory() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    // System categories cannot change name and type
    if (widget.category != null && widget.category!.isDefault) {
      _showError('系统默认分类不能修改名称和类型');
      return;
    }

    final categoryData = {
      'name': _nameController.text.trim(),
      'type': widget.categoryType,
      if (_selectedIcon != null) 'icon': _selectedIcon,
      if (_selectedColor != null) 'color': _selectedColor,
      if (_selectedParent != null) 'parent_id': _selectedParent!.id,
    };

    setState(() => _isLoading = true);

    try {
      if (widget.category == null) {
        // Create new category
        await ApiService.createCategory(categoryData);
      } else {
        // Update existing category
        await ApiService.updateCategory(widget.category!.id!, categoryData);
      }

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.category == null ? '分类创建成功！' : '分类更新成功！'),
            backgroundColor: Colors.green,
          ),
        );
        widget.onCategorySaved?.call();
      }
    } catch (e) {
      // 先检查是否是认证错误，如果是会自动跳转到登录页
      final isAuthError = await AuthHelper.handleAuthError(
        context,
        e,
        customMessage: '登录已过期，请重新登录后保存分类',
      );

      // 如果不是认证错误，显示通用错误信息
      if (!isAuthError && mounted) {
        _showError('保存失败：$e');
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditMode = widget.category != null;
    final isSystemCategory = widget.category?.isDefault ?? false;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 600),
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Title bar
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isEditMode ? '编辑分类' : '添加分类',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Category name
                      TextFormField(
                        controller: _nameController,
                        decoration: const InputDecoration(
                          labelText: '分类名称 *',
                          hintText: '例如：餐饮',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.category),
                        ),
                        enabled: !isSystemCategory,
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return '请输入分类名称';
                          }
                          if (value.trim().length > 20) {
                            return '分类名称不能超过20个字符';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Parent category (optional, for subcategories)
                      if (widget.parentCategories.isNotEmpty)
                        DropdownButtonFormField<Category>(
                          value: _selectedParent,
                          decoration: const InputDecoration(
                            labelText: '父分类（可选）',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.account_tree),
                          ),
                          hint: const Text('无（作为顶级分类）'),
                          items: [
                            const DropdownMenuItem<Category>(
                              value: null,
                              child: Text('无（作为顶级分类）'),
                            ),
                            ...widget.parentCategories.map((parent) {
                              return DropdownMenuItem<Category>(
                                value: parent,
                                child: Text(parent.name ?? ''),
                              );
                            }),
                          ],
                          onChanged: (value) {
                            setState(() => _selectedParent = value);
                          },
                        ),
                      const SizedBox(height: 16),

                      // Icon selection
                      const Text(
                        '图标',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 8),
                      
                      // Icon category tabs
                      Container(
                        height: 40,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          itemCount: _iconGroups.length,
                          itemBuilder: (context, index) {
                            final group = _iconGroups[index];
                            final isSelected = _selectedGroup == group['name'];
                            return Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: ChoiceChip(
                                label: Text(group['name']),
                                selected: isSelected,
                                onSelected: (selected) {
                                  setState(() => _selectedGroup = group['name']);
                                },
                                selectedColor: Colors.blue.shade100,
                                labelStyle: TextStyle(
                                  color: isSelected ? Colors.blue.shade800 : Colors.grey[700],
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Icon grid
                      GridView.builder(
                        shrinkWrap: true,
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 5,
                          mainAxisSpacing: 8,
                          crossAxisSpacing: 8,
                          childAspectRatio:1,
                        ),
                        itemCount: _getSelectedIcons().length,
                        itemBuilder: (context, index) {
                          final iconData = _getSelectedIcons()[index];
                          final isSelected = _selectedIcon == iconData['name'];
                          return GestureDetector(
                            onTap: () => setState(() => _selectedIcon = iconData['name']),
                            child: Container(
                              decoration: BoxDecoration(
                                color: isSelected ? Colors.blue : Colors.grey[200],
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isSelected ? Colors.blue : Colors.transparent,
                                  width: 2,
                                ),
                              ),
                              child: Icon(
                                iconData['icon'] as IconData,
                                color: isSelected ? Colors.white : Colors.grey[700],
                                size: 24,
                              ),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 16),

                      // Color selection
                      const Text(
                        '颜色',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: _colorOptions.map((color) {
                          final isSelected = _selectedColor == color;
                          return GestureDetector(
                            onTap: () => setState(() => _selectedColor = color),
                            child: Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: Color(
                                  int.parse(color.substring(1), radix: 16) + 0xFF000000,
                                ),
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: isSelected ? Colors.grey[800]! : Colors.transparent,
                                  width: isSelected ?3 :1,
                                ),
                              ),
                              child: isSelected
                                  ? const Icon(Icons.check, color: Colors.white, size: 20)
                                  : null,
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _isLoading ? null : () => Navigator.pop(context),
                      child: const Text('取消'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _saveCategory,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth:2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('保存'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Map<String, dynamic>> _getSelectedIcons() {
    final group = _iconGroups.firstWhere(
      (g) => g['name'] == _selectedGroup,
      orElse: () => _iconGroups[0],
    );
    return List<Map<String, dynamic>>.from(group['icons']);
  }
}

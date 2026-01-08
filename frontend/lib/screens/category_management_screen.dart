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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      body: Column(
        children: [
          const AppHeader(title: '分类管理'),
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

    return RefreshIndicator(
      onRefresh: _loadCategories,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: _categories.map((category) {
          // Check if this is a parent category (has subcategories)
          final hasSubcategories = category.name?.contains('subcategories') == true ||
                                   _categories.any((c) => c.parentId == category.id);

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

  Widget _buildParentCategoryCard(Category category) {
    // Get subcategories
    final subcategories = _categories.where((c) => c.parentId == category.id).toList();
    final hasSubcategories = subcategories.isNotEmpty;
    final isSystem = category.isDefault;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: hasSubcategories
          ? ExpansionTile(
              leading: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: _getCategoryColor(category.color).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
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
                  color: _getCategoryColor(category.color).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
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

    return ListTile(
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: _getCategoryColor(category.color).withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
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
    // Map icon names to IconData
    switch (iconName) {
      case 'restaurant':
        return Icons.restaurant;
      case 'shopping_cart':
        return Icons.shopping_cart;
      case 'directions_car':
        return Icons.directions_car;
      case 'home':
        return Icons.home;
      case 'movie':
        return Icons.movie;
      case 'local_hospital':
        return Icons.local_hospital;
      case 'school':
        return Icons.school;
      case 'phone':
        return Icons.phone;
      case 'card_giftcard':
        return Icons.card_giftcard;
      case 'attach_money':
        return Icons.attach_money;
      case 'trending_up':
        return Icons.trending_up;
      case 'work':
        return Icons.work;
      default:
        return Icons.category;
    }
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

  // Available icons
  final List<Map<String, dynamic>> _availableIcons = [
    {'name': 'restaurant', 'icon': Icons.restaurant},
    {'name': 'shopping_cart', 'icon': Icons.shopping_cart},
    {'name': 'directions_car', 'icon': Icons.directions_car},
    {'name': 'home', 'icon': Icons.home},
    {'name': 'movie', 'icon': Icons.movie},
    {'name': 'local_hospital', 'icon': Icons.local_hospital},
    {'name': 'school', 'icon': Icons.school},
    {'name': 'phone', 'icon': Icons.phone},
    {'name': 'card_giftcard', 'icon': Icons.card_giftcard},
    {'name': 'attach_money', 'icon': Icons.attach_money},
    {'name': 'trending_up', 'icon': Icons.trending_up},
    {'name': 'work', 'icon': Icons.work},
    {'name': 'category', 'icon': Icons.category},
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
        constraints: const BoxConstraints(maxWidth: 500),
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
                      GridView.builder(
                        shrinkWrap: true,
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 5,
                          mainAxisSpacing: 8,
                          crossAxisSpacing: 8,
                          childAspectRatio: 1,
                        ),
                        itemCount: _availableIcons.length,
                        itemBuilder: (context, index) {
                          final iconData = _availableIcons[index];
                          final isSelected = _selectedIcon == iconData['name'];
                          return GestureDetector(
                            onTap: () => setState(() => _selectedIcon = iconData['name']),
                            child: Container(
                              decoration: BoxDecoration(
                                color: isSelected ? Colors.blue : Colors.grey[200],
                                borderRadius: BorderRadius.circular(8),
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
                                  width: isSelected ? 3 : 1,
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
                                strokeWidth: 2,
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
}

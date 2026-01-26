import 'package:flutter/material.dart';
import '../models/category_model.dart';
import '../services/api_service.dart';
import '../components/app_header.dart';
import '../utils/auth_helper.dart';
import '../constants/app_constants.dart';
import '../constants/material_icons_unicode.dart';
import '../widgets/dynamic_icon.dart'
    show DynamicIcon; // 只导入 DynamicIcon，避免冲突

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

      // Debug logging
      for (var json in categoryList) {
      }

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

  // 初始化默认分类
  Future<void> _initDefaultCategories() async {
    // 确认对话框
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('初始化默认分类'),
        content: const Text('这将为您添加系统预设的默认分类（包括收入和支出分类及其子分类）。是否继续？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
            ),
            child: const Text('确认'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isLoading = true);

    try {
      final result = await ApiService.initDefaultCategories();
      final initialized = result['initialized'] ?? false;
      final message = result['message'] ?? '初始化完成';

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: initialized ? Colors.green : Colors.orange,
          ),
        );

        // 重新加载分类列表
        await _loadCategories();
      }
    } catch (e) {
      await AuthHelper.handleAuthError(
        context,
        e,
        customMessage: '登录已过期，请重新登录后初始化分类',
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('初始化失败：$e'),
            backgroundColor: Colors.red,
          ),
        );
        setState(() => _isLoading = false);
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

  // 更新分类顺序
  Future<void> _updateCategoryOrder() async {
    try {
      // Only update sortOrder for parent categories (parentId == null)
      final parentCategories = _categories.where((c) => c.parentId == null).toList();


      for (int i = 0; i < parentCategories.length; i++) {
        final category = parentCategories[i];
        if (category.id != null) {
          // Send update to backend - only update sortOrder field
          await ApiService.updateCategory(category.id!, {
            'sortOrder': i,
          });
        }
      }

      // 成功后不需要提示，也不需要重新加载（本地状态已经是最新的）
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('更新排序失败：$e'),
            backgroundColor: Colors.red,
          ),
        );
        // 失败时重新加载数据以恢复原状
        _loadCategories();
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
              TextButton.icon(
                onPressed: _initDefaultCategories,
                icon: const Icon(Icons.restore, size: 18),
                label: const Text('初始化默认分类'),
                style: TextButton.styleFrom(
                  foregroundColor: Colors.white,
                ),
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

    // Always use ReorderableListView for drag-and-drop
    return RefreshIndicator(
      onRefresh: _loadCategories,
      child: ReorderableListView(
        onReorder: _onParentReorder,
        padding: const EdgeInsets.all(16),
        children: _categories
            .where((c) => c.parentId == null)
            .map((category) => _buildParentCategoryCardWithDrag(category))
            .toList(),
      ),
    );
  }

  Widget _buildParentCategoryCardWithDrag(Category category) {
    // Get subcategories from model
    final subcategories = category.subcategories ?? [];
    final hasSubcategories = subcategories.isNotEmpty;
    final isSystem = category.isDefault;

    return ReorderableDelayedDragStartListener(
      key: ValueKey(category.id),
      index: _categories.indexOf(category),
      child: Card(
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
                  child: DynamicIcon(
                    iconCode: category.icon ?? '',
                    color: category.color,
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
                    const Icon(Icons.drag_handle, color: Colors.grey),
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
                  child: DynamicIcon(
                    iconCode: category.icon ?? '',
                    color: category.color,
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
                    const Icon(Icons.drag_handle, color: Colors.grey),
                  ],
                ),
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
          child: DynamicIcon(
            iconCode: category.icon ?? '',
            color: category.color,
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

  // 滚动控制器，用于自动滚动到选中项
  final ScrollController _iconScrollController = ScrollController();
  final ScrollController _colorScrollController = ScrollController();

  // Available colors（使用常量）
  final List<String> _colorOptions = AppColors.presetColors;

  // 获取所有可用的颜色选项（包括当前分类的颜色）
  List<String> get _allColorOptions {
    final options = List<String>.from(_colorOptions);
    // 如果当前颜色不在预设列表中，添加到最前面
    if (_selectedColor != null && !options.contains(_selectedColor)) {
      options.insert(0, _selectedColor!);
    }
    return options;
  }

  // 获取所有图标（使用 Unicode 码点列表）
  List<Map<String, dynamic>> get _allIcons {
    return getAllIconCodes();
  }

  @override
  void initState() {
    super.initState();

    if (widget.category != null) {
      // Edit mode: fill existing data
      _nameController.text = widget.category!.name ?? '';

      // Preserve icon and color
      final iconValue = widget.category!.icon;
      final colorValue = widget.category!.color;

      _selectedIcon = (iconValue != null && iconValue.isNotEmpty)
          ? iconValue
          : 'e574'; // 默认使用 category 图标的 Unicode 码点
      _selectedColor = (colorValue != null && colorValue.isNotEmpty)
          ? colorValue
          : AppColors.defaultColor;
      _selectedParent = widget.parentCategories
          .where((c) => c.id == widget.category!.parentId)
          .firstOrNull;

      // 延迟滚动到选中项
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _scrollToSelectedItem();
      });
    } else {
      // Add mode: select defaults
      _selectedColor = AppColors.defaultColor;
      _selectedIcon = 'e574'; // 默认使用 category 图标的 Unicode 码点
    }
  }

  // 自动滚动到选中项
  void _scrollToSelectedItem() {
    // 滚动图标网格到选中项
    final iconIndex = _allIcons.indexWhere((icon) => icon['code'] == _selectedIcon);
    if (iconIndex >= 0 && _iconScrollController.hasClients) {
      final crossAxisCount = 10; // 每行10个图标
      final row = (iconIndex / crossAxisCount).floor();
      final itemHeight = 60.0; // 图标高度 + 间距
      _iconScrollController.animateTo(
        row * itemHeight,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }

    // 滚动颜色列表到选中项
    final colorIndex = _allColorOptions.indexWhere((color) => color == _selectedColor);
    if (colorIndex >= 0 && _colorScrollController.hasClients) {
      final targetPosition = (colorIndex / 8).floor() * 50.0;
      _colorScrollController.animateTo(
        targetPosition,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }


  @override
  void dispose() {
    _nameController.dispose();
    _iconScrollController.dispose();
    _colorScrollController.dispose();
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

    // System categories restrictions:
    // - 一级系统分类：不能修改 name、type、parentId
    // - 二级系统分类：可以修改 parentId，但不能修改 name、type
    if (widget.category != null && widget.category!.isDefault) {
      // 一级系统分类（parentId为null）不能修改父分类
      if (widget.category!.parentId == null && _selectedParent != null) {
        _showError('系统一级分类不能修改父分类');
        return;
      }
    }

    final categoryData = {
      'name': _nameController.text.trim(),
      'type': widget.categoryType,
      if (_selectedIcon != null) 'icon': _selectedIcon,
      if (_selectedColor != null) 'color': _selectedColor,
      if (_selectedParent != null) 'parentId': _selectedParent!.id,
      if (widget.category != null && widget.category!.sortOrder != null)
        'sortOrder': widget.category!.sortOrder,
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
    final isTopLevelSystemCategory = isSystemCategory && widget.category?.parentId == null;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 900, maxHeight: 650),
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: Colors.grey[300]!, width: 1),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isEditMode ? '编辑分类' : '添加分类',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
            ),

            // Main content: two columns
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Left column: Basic info
                    Expanded(
                      flex: 4,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Category name
                          TextFormField(
                            controller: _nameController,
                            decoration: InputDecoration(
                              labelText: '分类名称 *',
                              hintText: '例如：餐饮',
                              border: const OutlineInputBorder(),
                              prefixIcon: const Icon(Icons.category),
                              filled: isSystemCategory,
                              fillColor: isSystemCategory ? Colors.grey[100] : null,
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
                          const SizedBox(height: 24),

                          // Parent category
                          if (widget.parentCategories.isNotEmpty)
                            DropdownButtonFormField<Category>(
                              value: _selectedParent,
                              decoration: InputDecoration(
                                labelText: '父分类',
                                border: const OutlineInputBorder(),
                                prefixIcon: const Icon(Icons.account_tree),
                                filled: isTopLevelSystemCategory,
                                fillColor: isTopLevelSystemCategory ? Colors.grey[100] : null,
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
                              onChanged: isTopLevelSystemCategory
                                  ? null
                                  : (value) {
                                      setState(() => _selectedParent = value);
                                    },
                            ),
                        ],
                      ),
                    ),

                    const SizedBox(width: 32),

                    // Right column: Icon and Color selection (linked design)
                    Expanded(
                      flex: 6,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Icon selection
                          Row(
                            children: [
                              const Text(
                                '图标',
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
                              ),
                              if (isSystemCategory) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.orange[100],
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    '系统分类不可修改',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: Colors.orange[700],
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 12),

                          // Icon grid (使用 DynamicIcon 渲染)
                          SizedBox(
                            height: 280,
                            child: AbsorbPointer(
                              absorbing: isSystemCategory,
                              child: Opacity(
                                opacity: isSystemCategory ? 0.5 : 1.0,
                                child: GridView.builder(
                                  controller: _iconScrollController,
                                  padding: EdgeInsets.zero,
                                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                    crossAxisCount: 10,
                                    mainAxisSpacing: 6,
                                    crossAxisSpacing: 6,
                                    childAspectRatio: 1,
                                  ),
                                  itemCount: _allIcons.length,
                                  itemBuilder: (context, index) {
                                    final iconData = _allIcons[index];
                                    final iconCode = iconData['code'] as String;
                                    final isSelected = _selectedIcon == iconCode;
                                    return GestureDetector(
                                      onTap: () => setState(() => _selectedIcon = iconCode),
                                      child: Container(
                                        decoration: BoxDecoration(
                                          color: isSelected ? Colors.blue : Colors.grey[100],
                                          borderRadius: BorderRadius.circular(8),
                                          border: Border.all(
                                            color: isSelected ? Colors.blue : Colors.transparent,
                                            width: 2,
                                          ),
                                        ),
                                        child: DynamicIcon(
                                          iconCode: iconCode,
                                          size: 18,
                                          color: isSelected ? '#FFFFFF' : '#616161',
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),

                          // Color selection
                          Row(
                            children: [
                              const Text(
                                '颜色',
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
                              ),
                              if (isSystemCategory) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.orange[100],
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    '系统分类不可修改',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: Colors.orange[700],
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 10),
                          Container(
                            height: 40,
                            child: AbsorbPointer(
                              absorbing: isSystemCategory,
                              child: Opacity(
                                opacity: isSystemCategory ? 0.5 : 1.0,
                                child: ListView.builder(
                                  scrollDirection: Axis.horizontal,
                                  itemCount: _allColorOptions.length,
                                  itemBuilder: (context, index) {
                                    final color = _allColorOptions[index];
                                    final isSelected = _selectedColor == color;
                                    return Padding(
                                      padding: const EdgeInsets.only(right: 10),
                                      child: GestureDetector(
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
                                              width: isSelected ? 3 : 2,
                                            ),
                                          ),
                                          child: isSelected
                                              ? const Icon(Icons.check, color: Colors.white, size: 18)
                                              : null,
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Footer with save button
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(color: Colors.grey[300]!, width: 1),
                ),
              ),
              child: Center(
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _saveCategory,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(200, 44),
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
                      : const Text('保存', style: TextStyle(fontSize: 15)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

}

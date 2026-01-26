import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AppHeader extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;

  const AppHeader({
    super.key,
    required this.title,
    this.actions,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          child: Row(
            children: [
              // Logo - 点击返回主页
              GestureDetector(
                onTap: () => _navigateToHub(context),
                child: Text(
                  'Alfred',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF333333),
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              const SizedBox(width: 24),

              // 导航链接
              Expanded(child: _buildNavLinks(context)),

              // 右侧操作区
              ...actions ?? [],
              _buildUserMenu(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavLinks(BuildContext context) {
    return Wrap(
      spacing: 8,
      children: [
        _NavLink(
          label: '健康',
          onTap: () => Navigator.pushNamed(context, '/dashboard'),
        ),
        _NavLink(
          label: '骑行',
          onTap: () => Navigator.pushNamed(context, '/activities'),
        ),
        _NavLink(
          label: '记账',
          onTap: () => Navigator.pushNamed(context, '/accounting'),
        ),
      ],
    );
  }

  Widget _buildUserMenu(BuildContext context) {
    return PopupMenuButton<String>(
      icon: const Icon(Icons.account_circle, color: Color(0xFF666666)),
      onSelected: (value) {
        switch (value) {
          case 'settings':
            Navigator.pushNamed(context, '/settings');
            break;
          case 'profile':
            Navigator.pushNamed(context, '/profile');
            break;
          case 'logout':
            _handleLogout(context);
            break;
        }
      },
      itemBuilder: (context) => [
        const PopupMenuItem(
          value: 'settings',
          child: Row(
            children: [
              Icon(Icons.settings, color: Colors.grey, size: 20),
              SizedBox(width: 12),
              Text('设置', style: TextStyle(fontSize: 14)),
            ],
          ),
        ),
        const PopupMenuItem(
          value: 'profile',
          child: Row(
            children: [
              Icon(Icons.person, color: Colors.grey, size: 20),
              SizedBox(width: 12),
              Text('个人资料', style: TextStyle(fontSize: 14)),
            ],
          ),
        ),
        const PopupMenuItem(
          value: 'logout',
          child: Row(
            children: [
              Icon(Icons.logout, color: Colors.grey, size: 20),
              SizedBox(width: 12),
              Text('退出登录', style: TextStyle(fontSize: 14)),
            ],
          ),
        ),
      ],
    );
  }

  void _navigateToHub(BuildContext context) {
    final currentRoute = ModalRoute.of(context)?.settings.name;
    if (currentRoute != '/hub') {
      Navigator.pushNamedAndRemoveUntil(
        context,
        '/hub',
        (Route<dynamic> route) => false,
      );
    }
  }

  Future<void> _handleLogout(BuildContext context) async {
    try {
      await ApiService.clearAccessToken();
      if (context.mounted) {
        Navigator.pushNamedAndRemoveUntil(
          context,
          '/login',
          (Route<dynamic> route) => false,
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('退出失败：$e')),
        );
      }
    }
  }

  @override
  Size get preferredSize => const Size.fromHeight(64);
}

/// 导航链接组件
class _NavLink extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _NavLink({
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 15,
              color: Color(0xFF666666),
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }
}

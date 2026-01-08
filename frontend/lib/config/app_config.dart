class AppConfig {
  // API服务器配置
  static const String _baseUrl = 'http://localhost:8000';

  // 生产环境地址
  static const String _productionBaseUrl = 'http://110.42.222.64:8000';

  // 是否为生产环境
  static const bool _isProduction = false;

  // 获取当前环境的base URL
  static String get baseUrl => _isProduction ? _productionBaseUrl : _baseUrl;

  // 地图HTML文件路径
  static String get mapHtmlUrl => '$baseUrl/static/map.html';
}
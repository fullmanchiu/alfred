import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:file_picker/file_picker.dart';
import '../config/app_config.dart';
import '../models/account_model.dart';

class ApiService {
  static String get baseUrl => AppConfig.baseUrl;
  static const String _tokenKey = 'access_token';
  static String? _accessToken;
  static const Duration _timeout = Duration(seconds: 30);
  static const int _maxRetries = 3;
  static const bool _debugMode = true;

  static Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    _accessToken = prefs.getString(_tokenKey);
    print('初始化令牌: $_accessToken');
  }

  // 检查响应是否为401，如果是则清除token
  static bool _isUnauthorized(int statusCode) {
    return statusCode == 401;
  }

  // 清除token并跳转到登录
  static Future<void> _handleUnauthorized() async {
    await clearAccessToken();
    // 注意：这里不能直接导航，因为API服务不应该依赖UI
    // 我们会在调用处处理导航
  }

  // 统一处理响应数据（Pure RESTful - 直接解析资源）
  // 注意：错误响应仍由GlobalExceptionHandler返回结构化格式
  static dynamic _handleResponse(http.Response response) {
    final decoded = jsonDecode(response.body);

    // 如果响应包含success字段，说明是错误响应（GlobalExceptionHandler返回的）
    if (decoded is Map && decoded.containsKey('success')) {
      if (decoded['success'] == false) {
        throw decoded['message'] ?? '操作失败';
      }
      // 即使有success字段，如果不是错误，也直接返回整个响应
      return decoded;
    }

    // Pure RESTful: 直接返回资源（可能是对象或数组）
    return decoded;
  }

  // 统一处理错误响应（保留用于兼容旧格式）
  static String _extractErrorMessage(dynamic error) {
    if (error is String) {
      return error;
    }
    if (error is Map) {
      // 尝试从错误响应中提取错误信息
      if (error.containsKey('detail')) {
        return error['detail'];
      }
      if (error.containsKey('message')) {
        return error['message'];
      }
      if (error.containsKey('error')) {
        final errorDetail = error['error'];
        if (errorDetail is Map && errorDetail.containsKey('message')) {
          return errorDetail['message'];
        }
        return errorDetail.toString();
      }
    }
    return '发生未知错误';
  }

  static Future<void> setAccessToken(String token) async {
    _accessToken = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    print('设置令牌: $token');
  }

  static Future<String?> getAccessToken() async {
    if (_accessToken == null) {
      final prefs = await SharedPreferences.getInstance();
      _accessToken = prefs.getString(_tokenKey);
      print('从本地获取令牌: $_accessToken');
    }
    return _accessToken;
  }

  static Future<void> clearAccessToken() async {
    _accessToken = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    print('清除令牌');
  }

  static Future<Map<String, String>> getHeaders() async {
    final headers = {
      'Content-Type': 'application/json',
    };
    final token = await getAccessToken();
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  static Future<http.Response> _postWithRetry(
    String url,
    Map<String, dynamic> body,
  ) async {
    int retryCount = 0;
    while (retryCount < _maxRetries) {
      try {
        if (_debugMode) {
          print('API Request: POST $url');
          print('Request Body: ${jsonEncode(body)}');
        }

        final response = await http
            .post(
              Uri.parse(url),
              headers: await getHeaders(),
              body: jsonEncode(body),
            )
            .timeout(_timeout);

        if (_debugMode) {
          print('Response Status: ${response.statusCode}');
          print('Response Body: ${response.body}');
        }

        // 检查 HTTP 状态码，如果不是 2xx 则抛出异常
        if (response.statusCode < 200 || response.statusCode >= 300) {
          final errorData = jsonDecode(response.body);
          throw _extractErrorMessage(errorData);
        }

        // 成功响应，直接返回，不重试
        return response;
      } on TimeoutException {
        // 只有超时才重试
        retryCount++;
        if (retryCount >= _maxRetries) {
          throw Exception('请求超时，请检查网络连接');
        }
        if (_debugMode) {
          print('Request timeout, retrying... ($retryCount/$_maxRetries)');
        }
        await Future.delayed(Duration(seconds: retryCount));
      } catch (e) {
        // 有响应的错误（404、401、500等）不重试，直接抛出
        if (_debugMode) {
          print('Request error (no retry): $e');
        }
        rethrow;
      }
    }
    throw Exception('请求失败，已重试$_maxRetries次');
  }

  static Future<http.Response> _getWithRetry(
    String url,
  ) async {
    int retryCount = 0;
    while (retryCount < _maxRetries) {
      try {
        if (_debugMode) {
          print('API Request: GET $url');
        }

        final response = await http
            .get(
              Uri.parse(url),
              headers: await getHeaders(),
            )
            .timeout(_timeout);

        if (_debugMode) {
          print('Response Status: ${response.statusCode}');
        }

        // 检查 HTTP 状态码
        if (response.statusCode < 200 || response.statusCode >= 300) {
          final errorData = jsonDecode(response.body);
          throw _extractErrorMessage(errorData);
        }

        // 成功响应，直接返回，不重试
        return response;
      } on TimeoutException {
        // 只有超时才重试
        retryCount++;
        if (retryCount >= _maxRetries) {
          throw Exception('请求超时，请检查网络连接');
        }
        if (_debugMode) {
          print('Request timeout, retrying... ($retryCount/$_maxRetries)');
        }
        await Future.delayed(Duration(seconds: retryCount));
      } catch (e) {
        // 有响应的错误（404、401、500等）不重试，直接抛出
        if (_debugMode) {
          print('Request error (no retry): $e');
        }
        rethrow;
      }
    }
    throw Exception('请求失败，已重试$_maxRetries次');
  }

  static Future<http.Response> _deleteWithRetry(String url) async {
    int retryCount = 0;
    while (retryCount < _maxRetries) {
      try {
        if (_debugMode) {
          print('API Request: DELETE $url');
        }

        final response = await http
            .delete(
              Uri.parse(url),
              headers: await getHeaders(),
            )
            .timeout(_timeout);

        if (_debugMode) {
          print('Response Status: ${response.statusCode}');
        }

        // 检查 HTTP 状态码
        if (response.statusCode < 200 || response.statusCode >= 300) {
          final errorData = jsonDecode(response.body);
          throw _extractErrorMessage(errorData);
        }

        // 成功响应，直接返回，不重试
        return response;
      } on TimeoutException {
        // 只有超时才重试
        retryCount++;
        if (retryCount >= _maxRetries) {
          throw Exception('请求超时，请检查网络连接');
        }
        if (_debugMode) {
          print('Request timeout, retrying... ($retryCount/$_maxRetries)');
        }
        await Future.delayed(Duration(seconds: retryCount));
      } catch (e) {
        // 有响应的错误（404、401、500等）不重试，直接抛出
        if (_debugMode) {
          print('Request error (no retry): $e');
        }
        rethrow;
      }
    }
    throw Exception('请求失败，已重试$_maxRetries次');
  }

  static Future<http.Response> _putWithRetry(
    String url,
    Map<String, dynamic> body,
  ) async {
    int retryCount = 0;
    while (retryCount < _maxRetries) {
      try {
        if (_debugMode) {
          print('API Request: PUT $url');
          print('Request Body: ${jsonEncode(body)}');
        }

        final response = await http
            .put(
              Uri.parse(url),
              headers: await getHeaders(),
              body: jsonEncode(body),
            )
            .timeout(_timeout);

        if (_debugMode) {
          print('Response Status: ${response.statusCode}');
        }

        // 检查 HTTP 状态码
        if (response.statusCode < 200 || response.statusCode >= 300) {
          final errorData = jsonDecode(response.body);
          throw _extractErrorMessage(errorData);
        }

        // 成功响应，直接返回，不重试
        return response;
      } on TimeoutException {
        // 只有超时才重试
        retryCount++;
        if (retryCount >= _maxRetries) {
          throw Exception('请求超时，请检查网络连接');
        }
        if (_debugMode) {
          print('Request timeout, retrying... ($retryCount/$_maxRetries)');
        }
        await Future.delayed(Duration(seconds: retryCount));
      } catch (e) {
        // 有响应的错误（404、401、500等）不重试，直接抛出
        if (_debugMode) {
          print('Request error (no retry): $e');
        }
        rethrow;
      }
    }
    throw Exception('请求失败，已重试$_maxRetries次');
  }

  static Future<Map<String, dynamic>> login(String username, String password) async {
    final response = await _postWithRetry(
      '$baseUrl/api/v1/auth/login',
      {'username': username, 'password': password},
    );

    // Pure RESTful: 直接返回AuthResponse对象 {token, tokenType, expiresIn, user}
    final data = _handleResponse(response) as Map<String, dynamic>;

    // 保存 token
    if (data['token'] != null && data['token'] is String) {
      await setAccessToken(data['token'] as String);
    }

    return data;
  }

  static Future<Map<String, dynamic>> register(String username, String password) async {
    final response = await _postWithRetry(
      '$baseUrl/api/v1/auth/register',
      {'username': username, 'password': password},
    );

    // Pure RESTful: 直接返回AuthResponse对象 {token, tokenType, expiresIn, user}
    final data = _handleResponse(response) as Map<String, dynamic>;

    // 保存 token
    if (data['token'] != null && data['token'] is String) {
      await setAccessToken(data['token'] as String);
    }

    return data;
  }

  static Future<Map<String, dynamic>> getUserProfile() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/v1/user/profile'),
      headers: await getHeaders(),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['detail'] ?? '获取用户信息失败';
    }
  }

  static Future<Map<String, dynamic>> getActivities({String type = ''}) async {
    final url = type.isEmpty ? '$baseUrl/api/v1/activities' : '$baseUrl/api/v1/activities?type=$type';
    final response = await http.get(
      Uri.parse(url),
      headers: await getHeaders(),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['detail'] ?? '获取活动列表失败';
    }
  }

  static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> profileData) async {
    final response = await http.put(
      Uri.parse('$baseUrl/api/v1/user/profile'),
      headers: await getHeaders(),
      body: jsonEncode(profileData),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['detail'] ?? '更新用户资料失败';
    }
  }

  // 健康数据相关API
  static Future<Map<String, dynamic>> getHealthProfile() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/v1/health/profile'),
      headers: await getHeaders(),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['detail'] ?? '获取健康数据失败';
    }
  }

  static Future<Map<String, dynamic>> createHealthProfile(Map<String, dynamic> profileData) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/health/profile'),
      headers: await getHeaders(),
      body: jsonEncode(profileData),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['detail'] ?? '创建健康数据失败';
    }
  }

  static Future<Map<String, dynamic>> updateHealthProfile(Map<String, dynamic> profileData) async {
    final response = await http.put(
      Uri.parse('$baseUrl/api/v1/health/profile'),
      headers: await getHeaders(),
      body: jsonEncode(profileData),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['detail'] ?? '更新健康数据失败';
    }
  }

  static Future<Map<String, dynamic>> getHealthHistory() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/v1/health/history'),
      headers: await getHeaders(),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['detail'] ?? '获取健康历史记录失败';
    }
  }

  static Future<Map<String, dynamic>> getActivityDetail(int activityId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/v1/activities/$activityId'),
      headers: await getHeaders(),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['detail'] ?? '获取活动详情失败';
    }
  }

  static Future<Map<String, dynamic>> uploadFitFiles(List<String> filePaths) async {
    try {
      final uri = Uri.parse('$baseUrl/api/v1/upload');
      final request = http.MultipartRequest('POST', uri);

      // 添加认证头
      final headers = await getHeaders();
      request.headers.addAll(headers);

      // 添加文件 - 支持Web和移动端
      for (String filePath in filePaths) {
        if (filePath.startsWith('blob:')) {
          // Web平台处理
          // 这里实际上我们会从add_record_menu_dialog调用，所以这个方法可能不会被使用
          print('Web文件路径: $filePath');
        } else {
          // 移动端处理
          final file = File(filePath);
          if (await file.exists()) {
            final fileSize = await file.length();
            final stream = file.openRead();
            final multipartFile = http.MultipartFile(
              'files',
              stream,
              fileSize,
              filename: filePath.split('/').last,
            );
            request.files.add(multipartFile);
          } else {
            throw Exception('文件不存在: $filePath');
          }
        }
      }

      // 发送请求
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (_isUnauthorized(response.statusCode)) {
        await _handleUnauthorized();
        throw '登录已过期，请重新登录';
      } else {
        final errorData = jsonDecode(response.body);
        throw errorData['detail'] ?? '上传失败';
      }
    } catch (e) {
      throw Exception('上传失败: $e');
    }
  }

  // 新的Web平台文件上传方法
  static Future<Map<String, dynamic>> uploadFitFilesFromBytes(List<PlatformFile> files) async {
    try {
      final uri = Uri.parse('$baseUrl/api/v1/upload');
      final request = http.MultipartRequest('POST', uri);

      // 添加认证头
      final headers = await getHeaders();
      request.headers.addAll(headers);

      // 添加文件
      for (var file in files) {
        if (file.bytes != null) {
          request.files.add(http.MultipartFile.fromBytes(
            'files',
            file.bytes!,
            filename: file.name,
          ));
        }
      }

      // 发送请求
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (_isUnauthorized(response.statusCode)) {
        await _handleUnauthorized();
        throw '登录已过期，请重新登录';
      } else {
        final errorData = jsonDecode(response.body);
        throw errorData['detail'] ?? '上传失败';
      }
    } catch (e) {
      throw Exception('上传失败: $e');
    }
  }

  // ==================== 记账功能 API ====================

  // 获取记账记录列表
  static Future<Map<String, dynamic>> getTransactions({
    String? type,
    int? categoryId,
    String? startDate,
    String? endDate,
    double? minAmount,
    double? maxAmount,
    String? keyword,
    int page = 1,
    int pageSize = 20,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'page_size': pageSize.toString(),
    };

    if (type != null) queryParams['type'] = type;
    if (categoryId != null) queryParams['category_id'] = categoryId.toString();
    if (startDate != null) queryParams['start_date'] = startDate;
    if (endDate != null) queryParams['end_date'] = endDate;
    if (minAmount != null) queryParams['min_amount'] = minAmount.toString();
    if (maxAmount != null) queryParams['max_amount'] = maxAmount.toString();
    if (keyword != null) queryParams['keyword'] = keyword;

    final uri = Uri.parse('$baseUrl/api/v1/transactions')
        .replace(queryParameters: queryParams);

    final response = await _getWithRetry(uri.toString());

    if (response.statusCode == 200) {
      // Pure RESTful: 直接返回数组，通过HTTP header传递分页信息
      final decoded = jsonDecode(response.body);
      final totalCount = response.headers['x-total-count'];

      return {
        'transactions': decoded as List,
        'total': int.parse(totalCount ?? '0'),
      };
    } else if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['detail'] ?? '获取记账记录失败';
    }
  }

  // 创建记账记录
  static Future<Map<String, dynamic>> createTransaction(Map<String, dynamic> transactionData) async {
    final response = await _postWithRetry(
      '$baseUrl/api/v1/transactions',
      transactionData,
    );

    // Pure RESTful: 201 Created, 直接返回创建的资源
    if (response.statusCode == 200 || response.statusCode == 201) {
      final decoded = jsonDecode(response.body);
      return decoded as Map<String, dynamic>;
    } else if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['detail'] ?? '创建记账记录失败';
    }
  }

  // 更新记账记录
  static Future<Map<String, dynamic>> updateTransaction(int transactionId, Map<String, dynamic> transactionData) async {
    final response = await _putWithRetry(
      '$baseUrl/api/v1/transactions/$transactionId',
      transactionData,
    );

    // Pure RESTful: 200 OK, 直接返回更新的资源
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      return decoded as Map<String, dynamic>;
    } else if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['detail'] ?? '更新记账记录失败';
    }
  }

  // 删除记账记录
  static Future<void> deleteTransaction(int transactionId) async {
    final response = await _deleteWithRetry(
      '$baseUrl/api/v1/transactions/$transactionId',
    );

    // 204无响应体，直接成功
    if (response.statusCode == 204) {
      return;
    }

    // 其他状态码处理错误
    if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    }

    throw '删除记账记录失败';
  }

  // 获取记账统计
  static Future<Map<String, dynamic>> getTransactionStats({
    String? type,
    String? period,
    String? startDate,
    String? endDate,
    int? categoryId,
  }) async {
    final queryParams = <String, String>{};

    // 映射前端的 period 参数到后端期望的格式
    if (period != null) {
      // 前端可能使用 daily/weekly/monthly/yearly
      // 后端期望 week/month/year
      if (period == 'daily') {
        queryParams['period'] = 'week';  // 使用 week 作为默认
      } else if (period == 'weekly') {
        queryParams['period'] = 'week';
      } else if (period == 'monthly') {
        queryParams['period'] = 'month';
      } else if (period == 'yearly') {
        queryParams['period'] = 'year';
      } else {
        queryParams['period'] = period;
      }
    }

    // 后端 statistics/overview 不支持 type 和 categoryId 参数
    // 这些筛选在前端进行

    final uri = Uri.parse('$baseUrl/api/v1/statistics/overview')
        .replace(queryParameters: queryParams);

    final response = await http.get(uri, headers: await getHeaders());

    if (response.statusCode == 200) {
      // Pure RESTful: 直接返回统计对象
      final decoded = jsonDecode(response.body) as Map<String, dynamic>;
      // 映射后端响应到前端期望的格式
      return {
        'total_income': decoded['income_total'] ?? 0.0,
        'total_expense': decoded['expense_total'] ?? 0.0,
        'balance': decoded['net_savings'] ?? 0.0,
        'transaction_count': 0,  // 后端没有提供，后续可以计算
        'by_category': decoded['category_breakdown'] ?? [],
        'by_date': [],  // 后端 overview 接口不提供，需要调用 trend 接口
      };
    } else if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['detail'] ?? '获取统计数据失败';
    }
  }

  // ==================== 分类管理 API ====================

  // 获取分类列表
  static Future<Map<String, dynamic>> getCategories({String? type}) async {
    final url = type != null
        ? '$baseUrl/api/v1/categories?type=$type'
        : '$baseUrl/api/v1/categories';

    final response = await http.get(
      Uri.parse(url),
      headers: await getHeaders(),
    );

    if (response.statusCode == 200) {
      // Pure RESTful: 直接返回数组，通过HTTP header传递分页信息
      final decoded = jsonDecode(response.body);
      final totalCount = response.headers['x-total-count'];

      return {
        'categories': decoded as List,
        'total': int.parse(totalCount ?? '0'),
      };
    } else if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['detail'] ?? '获取分类列表失败';
    }
  }

  // 创建分类
  static Future<Map<String, dynamic>> createCategory(Map<String, dynamic> categoryData) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/categories'),
      headers: await getHeaders(),
      body: jsonEncode(categoryData),
    );

    // Pure RESTful: 201 Created, 直接返回创建的资源
    if (response.statusCode == 200 || response.statusCode == 201) {
      final decoded = jsonDecode(response.body);
      return decoded as Map<String, dynamic>;
    } else if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['detail'] ?? '创建分类失败';
    }
  }

  // 更新分类
  static Future<Map<String, dynamic>> updateCategory(int categoryId, Map<String, dynamic> categoryData) async {
    final response = await http.put(
      Uri.parse('$baseUrl/api/v1/categories/$categoryId'),
      headers: await getHeaders(),
      body: jsonEncode(categoryData),
    );

    // Pure RESTful: 200 OK, 直接返回更新的资源
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      return decoded as Map<String, dynamic>;
    } else if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['detail'] ?? '更新分类失败';
    }
  }

  // 删除分类
  static Future<void> deleteCategory(int categoryId) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/api/v1/categories/$categoryId'),
      headers: await getHeaders(),
    );

    // 204无响应体，直接成功
    if (response.statusCode == 204) {
      return;
    }

    // 其他状态码处理错误
    if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    }

    throw '删除分类失败';
  }

  // ==================== 预算管理 API ====================

  // 获取预算列表
  static Future<Map<String, dynamic>> getBudgets({String? period}) async {
    final url = period != null
        ? '$baseUrl/api/v1/budgets?period=$period'
        : '$baseUrl/api/v1/budgets';

    final response = await http.get(
      Uri.parse(url),
      headers: await getHeaders(),
    );

    if (response.statusCode == 200) {
      // Pure RESTful: 直接返回数组，通过HTTP header传递分页信息
      final decoded = jsonDecode(response.body);
      final totalCount = response.headers['x-total-count'];

      return {
        'budgets': decoded as List,
        'total': int.parse(totalCount ?? '0'),
      };
    } else if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['detail'] ?? '获取预算列表失败';
    }
  }

  // 创建预算
  static Future<Map<String, dynamic>> createBudget(Map<String, dynamic> budgetData) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/budgets'),
      headers: await getHeaders(),
      body: jsonEncode(budgetData),
    );

    // Pure RESTful: 201 Created, 直接返回创建的资源
    if (response.statusCode == 200 || response.statusCode == 201) {
      final decoded = jsonDecode(response.body);
      return decoded as Map<String, dynamic>;
    } else if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['detail'] ?? '创建预算失败';
    }
  }

  // 更新预算
  static Future<Map<String, dynamic>> updateBudget(int budgetId, Map<String, dynamic> budgetData) async {
    final response = await http.put(
      Uri.parse('$baseUrl/api/v1/budgets/$budgetId'),
      headers: await getHeaders(),
      body: jsonEncode(budgetData),
    );

    // Pure RESTful: 200 OK, 直接返回更新的资源
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      return decoded as Map<String, dynamic>;
    } else if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['detail'] ?? '更新预算失败';
    }
  }

  // 删除预算
  static Future<void> deleteBudget(int budgetId) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/api/v1/budgets/$budgetId'),
      headers: await getHeaders(),
    );

    // 204无响应体，直接成功
    if (response.statusCode == 204) {
      return;
    }

    // 其他状态码处理错误
    if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    }

    throw '删除预算失败';
  }

  // ==================== 账户管理 API ====================

  // 获取账户列表
  static Future<List<Account>> getAccounts() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/v1/accounts'),
      headers: await getHeaders(),
    );

    if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      return [];
    }

    if (response.statusCode == 200) {
      // Pure RESTful: 账户列表需要返回total_balance，使用对象包装
      // 返回: {accounts: [...], totalBalance: ...}
      final decoded = jsonDecode(response.body) as Map<String, dynamic>;
      if (decoded.containsKey('accounts')) {
        final accountsJson = decoded['accounts'] as List;
        return accountsJson.map((json) => Account.fromJson(json)).toList();
      }
      return [];
    } else {
      throw '获取账户列表失败';
    }
  }

  // 创建账户
  static Future<Map<String, dynamic>> createAccount(Map<String, dynamic> accountData) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/accounts'),
      headers: await getHeaders(),
      body: jsonEncode(accountData),
    );

    if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    }

    // Pure RESTful: 201 Created, 直接返回创建的资源
    if (response.statusCode == 200 || response.statusCode == 201) {
      final decoded = jsonDecode(response.body);
      return decoded as Map<String, dynamic>;
    }

    throw '创建账户失败';
  }

  // 更新账户
  static Future<Map<String, dynamic>> updateAccount(int accountId, Map<String, dynamic> accountData) async {
    final response = await http.put(
      Uri.parse('$baseUrl/api/v1/accounts/$accountId'),
      headers: await getHeaders(),
      body: jsonEncode(accountData),
    );

    if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    }

    // Pure RESTful: 200 OK, 直接返回更新的资源
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      return decoded as Map<String, dynamic>;
    }

    final errorData = jsonDecode(response.body);
    throw errorData['detail'] ?? '更新账户失败';
  }

  // 删除账户
  static Future<void> deleteAccount(int accountId) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/api/v1/accounts/$accountId'),
      headers: await getHeaders(),
    );

    if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    }

    // 204无响应体，直接成功
    if (response.statusCode == 204) {
      return;
    }

    throw '删除账户失败';
  }

  // 调整账户余额（用于首次设置初始余额或账户对账）
  static Future<Map<String, dynamic>> adjustAccountBalance(
    int accountId,
    double balance, {
    String reason = '余额调整',
  }) async {
    final response = await _putWithRetry(
      '$baseUrl/api/v1/accounts/$accountId/balance',
      {
        'balance': balance,
        'reason': reason,
      },
    );

    // Pure RESTful: 200 OK, 直接返回更新后的账户资源
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      return decoded as Map<String, dynamic>;
    } else if (_isUnauthorized(response.statusCode)) {
      await _handleUnauthorized();
      throw '登录已过期，请重新登录';
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['detail'] ?? '调整账户余额失败';
    }
  }

  // ==================== 交易图片上传 API ====================

  /// Upload images for a transaction
  static Future<Map<String, dynamic>> uploadTransactionImages(
    int transactionId,
    List<File> files,
  ) async {
    final headers = await getHeaders();
    // Remove Content-Type to let multipart set boundary
    headers.remove('Content-Type');

    final uri = Uri.parse('$baseUrl/api/v1/transactions/$transactionId/images');
    final request = http.MultipartRequest('POST', uri)
      ..headers.addAll(headers);

    for (var file in files) {
      final fileStream = http.ByteStream(file.openRead());
      final length = await file.length();
      final multipartFile = http.MultipartFile(
        'files',
        fileStream,
        length,
        filename: file.path.split(Platform.pathSeparator).last,
      );
      request.files.add(multipartFile);
    }

    final response = await request.send();
    if (response.statusCode == 200 || response.statusCode == 201) {
      final responseBody = await response.stream.bytesToString();
      return jsonDecode(responseBody);
    } else {
      throw Exception('Upload failed: ${response.statusCode}');
    }
  }

  /// Delete a transaction image
  static Future<void> deleteTransactionImage(
    int transactionId,
    int imageId,
  ) async {
    final headers = await getHeaders();
    final uri = Uri.parse('$baseUrl/api/v1/transactions/$transactionId/images/$imageId');

    final response = await http.delete(uri, headers: headers);
    if (response.statusCode != 200) {
      throw Exception('Delete failed: ${response.statusCode}');
    }
  }
}
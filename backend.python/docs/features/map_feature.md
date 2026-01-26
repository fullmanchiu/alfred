# 地图功能文档

## 1. 功能概述

ColaFit 地图功能用于可视化用户的活动轨迹，支持动态更新路线数据，并兼容 Web 和移动平台。

### 1.1 核心功能
- 活动轨迹可视化
- 动态路线更新
- 支持多种坐标系统转换
- 跨平台兼容（Web 和移动端）
- 集成高德地图 API

### 1.2 技术栈
- **地图服务**: 高德地图 API
- **前端组件**: Flutter WebView/iframe
- **后端支持**: FastAPI 地图代理服务

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│                 │       │                 │       │                 │
│   Flutter       │       │   FastAPI       │◄────►│   高德地图       │
│   前端应用       │◄────►│   后端服务       │       │   API           │
│                 │       │                 │       │                 │
└─────────┬───────┘       └─────────┬───────┘       └─────────────────┘
         │                         │
┌────────▼────────┐       ┌────────▼────────┐
│   地图组件        │       │   地图代理服务    │
│   ActivityMap    │       │   _AMapService  │
└─────────────────┘       └─────────────────┘
         │                         │
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│                 │       │                 │
│   WebView/iframe│       │   map.html      │
│   加载高德地图     │       │   地图HTML文件   │
│                 │       │                 │
└─────────────────┘       └─────────────────┘
```

### 2.2 核心组件

#### 2.2.1 前端地图组件 (`ActivityMap`)
- 位于 `lib/components/activity_map.dart`
- 支持 Web 和移动端
- 动态更新路线数据

#### 2.2.2 后端地图代理服务
- 位于 `app/main.py` 中的 `/AMapService` 端点
- 处理高德地图 API 请求
- 提供安全的 API 密钥管理

#### 2.2.3 地图 HTML 文件
- 位于 `app/web/static/map.html`
- 加载高德地图 SDK
- 处理地图渲染和交互
- 支持接收来自 Flutter 应用的路线数据

## 3. 实现细节

### 3.1 前端实现

#### 3.1.1 地图组件结构

```dart
class ActivityMap extends StatefulWidget {
  final List<dynamic> points;
  // ...
}

class _ActivityMapState extends State<ActivityMap> {
  bool _isLoading = true;
  html.IFrameElement? _iframeElement;
  String? _iframeId;
  // ...
}
```

#### 3.1.2 平台兼容处理

```dart
if (kIsWeb) {
  // Web平台使用iframe
  return _buildIframeMap();
} else {
  // 移动平台使用WebView
  return _buildWebViewMap();
}
```

#### 3.1.3 Web 平台实现

1. **iframe 初始化**:
   ```dart
   _iframeElement = html.IFrameElement()
     ..src = '${AppConfig.mapHtmlUrl}?t=${DateTime.now().millisecondsSinceEpoch}'
     ..style.width = '100%'
     ..style.height = '100%'
     ..style.border = 'none'
     ..style.borderRadius = '12px';
   ```

2. **注册 iframe 到 Flutter 视图**:
   ```dart
   ui.platformViewRegistry.registerViewFactory(
     _iframeId!,
     (int viewId) => _iframeElement!,
   );
   ```

3. **通过 postMessage 传递数据**:
   ```dart
   _iframeElement!.contentWindow?.postMessage(
     convert.jsonEncode(routeData),
     '*'
   );
   ```

#### 3.1.4 移动端实现

- 目前使用占位符，待完善
- 计划使用 `webview_flutter` 包实现

### 3.2 后端实现

#### 3.2.1 地图代理服务

```python
@app.api_route("/_AMapService/{path:path}", methods=["GET", "POST"])
async def amap_proxy_service(request: Request, path: str = ""):
    """
    高德地图JSAPI安全代理服务
    """
    # 1. 读取配置
    from app.core.config import settings
    api_key = settings.AMAP_API_KEY
    api_secret = settings.AMAP_API_SECRET
    
    # 2. 获取查询参数
    query_params = dict(request.query_params)
    
    # 3. 添加密钥参数
    query_params['key'] = api_key
    
    if api_secret and api_secret != "":
        query_params['jscode'] = api_secret
    
    # 4. 路由分发和请求转发
    # ...
```

#### 3.2.2 地图 HTML 文件

1. **高德地图加载**:
   ```javascript
   const AMap = await AMapLoader.load({
       key: '480294b8e2302bda9c80df150f6da88b', // 高德地图API key
       version: '2.0',
       plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.MapType', 'AMap.Polyline', 'AMap.Marker'],
   });
   ```

2. **坐标转换**:
   ```javascript
   // WGS84转GCJ-02坐标系转换函数
   function wgs84ToGcj02(lng, lat) {
       // ...
   }
   ```

3. **路线绘制**:
   ```javascript
   // 绘制路线
   const polyline = new AMap.Polyline({
       path: validPoints,
       strokeColor: '#4285f4',
       strokeWeight: 4,
       strokeOpacity: 0.8
   });
   ```

4. **消息监听**:
   ```javascript
   // 监听来自Flutter的消息
   window.addEventListener('message', function(event) {
       try {
           const data = JSON.parse(event.data);
           if (data.type === 'updateRoute' && data.points) {
               updateRoute(data.points);
           }
       } catch (error) {
           console.error('处理消息失败:', error);
       }
   });
   ```

## 4. 数据流程

### 4.1 初始加载流程

```
1. Flutter应用初始化ActivityMap组件
2. 组件根据平台类型选择使用iframe或WebView
3. 加载后端提供的map.html文件
4. map.html初始化高德地图
5. 地图加载完成后显示默认地图
```

### 4.2 动态更新路线流程

```
1. Flutter应用获取活动GPS数据
2. 将数据传递给ActivityMap组件
3. 组件通过postMessage将数据发送给iframe/WebView
4. map.html接收消息并解析路线数据
5. 进行坐标转换（WGS84 → GCJ-02）
6. 更新地图上的路线显示
7. 自动调整地图视角以适应路线
```

## 5. 使用指南

### 5.1 前端使用

#### 5.1.1 导入组件

```dart
import '../components/activity_map.dart';
```

#### 5.1.2 使用组件

```dart
ActivityMap(
  points: activityPoints, // GPS点数据
)
```

#### 5.1.3 准备GPS数据

```dart
List<dynamic> activityPoints = [
  {
    'latitude': 39.9042,
    'longitude': 116.4074,
    // 可选：时间、速度、心率等
  },
  // 更多GPS点...
];
```

### 5.2 后端配置

#### 5.2.1 高德地图API密钥配置

在 `app/core/config.py` 中配置高德地图API密钥：

```python
AMAP_API_KEY = "your_amap_api_key"
AMAP_API_SECRET = "your_amap_api_secret"  # 可选
```

#### 5.2.2 部署map.html

确保 `map.html` 文件位于 `app/web/static/` 目录下，以便后端可以正确提供该文件。

## 6. 坐标系统

### 6.1 支持的坐标系统
- **WGS84**: 全球定位系统使用的坐标系统，FIT文件默认使用
- **GCJ-02**: 高德地图使用的火星坐标系

### 6.2 坐标转换

地图组件会自动处理坐标转换：

```javascript
// WGS84 → GCJ-02
const gcjResult = wgs84ToGcj02(lng, lat);
lng = gcjResult.lng;
lat = gcjResult.lat;
```

## 7. 性能优化

### 7.1 前端优化
- 延迟初始化，确保资源加载完成
- 异步更新路线数据
- 避免频繁重绘地图

### 7.2 后端优化
- 地图代理服务缓存机制
- 异步处理地图请求
- 合理设置API请求参数

## 8. 错误处理

### 8.1 常见错误

| 错误类型 | 可能原因 | 解决方案 |
|----------|----------|----------|
| 地图加载失败 | 网络问题或API密钥错误 | 检查网络连接和API密钥配置 |
| 路线不显示 | GPS数据格式错误或坐标转换失败 | 检查GPS数据格式和坐标转换逻辑 |
| 性能问题 | GPS点数量过多 | 优化GPS数据，减少点数量或使用抽稀算法 |

### 8.2 错误处理机制

- 前端组件显示加载状态和错误提示
- 后端代理服务返回详细错误信息
- 地图HTML包含错误处理和重试机制

## 9. 浏览器兼容性

| 浏览器 | 版本要求 | 支持情况 |
|--------|----------|----------|
| Chrome | 90+ | ✅ 完全支持 |
| Firefox | 88+ | ✅ 完全支持 |
| Safari | 14+ | ✅ 完全支持 |
| Edge | 90+ | ✅ 完全支持 |

## 10. 移动平台支持

| 平台 | 支持情况 | 实现方式 |
|------|----------|----------|
| Android | ✅ 支持 | WebView（待完善） |
| iOS | ✅ 支持 | WebView（待完善） |
| Web | ✅ 完全支持 | iframe |

## 11. 未来规划

### 11.1 功能扩展
- 添加更多地图样式选项
- 支持轨迹回放功能
- 添加海拔剖面图
- 支持多点标记和兴趣点

### 11.2 技术优化
- 完善移动端WebView实现
- 优化坐标转换性能
- 添加离线地图支持
- 增强地图交互体验

### 11.3 平台适配
- 优化各平台地图加载性能
- 添加平台特定地图功能

## 12. 调试指南

### 12.1 前端调试

1. **Web平台**:
   - 使用浏览器开发者工具检查iframe内容
   - 查看控制台日志
   - 使用postMessage调试工具

2. **移动端**:
   - 使用Chrome DevTools远程调试
   - 查看Flutter控制台日志
   - 使用WebView调试工具

### 12.2 后端调试

1. **查看API请求日志**:
   ```bash
   uvicorn app.main:app --reload --log-level debug
   ```

2. **测试地图代理服务**:
   ```bash
   curl "http://localhost:8000/_AMapService/v3/geocode/geo?address=北京市朝阳区"
   ```

### 12.3 地图HTML调试

- 直接访问 `http://localhost:8000/static/map.html` 进行测试
- 使用浏览器开发者工具检查地图加载情况
- 查看控制台错误信息

## 13. 常见问题

### 13.1 地图不显示

**问题**: 地图组件只显示灰色背景，不显示地图内容

**可能原因**:
- API密钥错误或过期
- 网络连接问题
- 坐标转换失败

**解决方案**:
- 检查高德地图API密钥配置
- 确认网络连接正常
- 检查GPS数据格式和坐标范围

### 13.2 路线显示不正确

**问题**: 地图上的路线与实际轨迹不符

**可能原因**:
- 坐标系统不匹配
- GPS数据质量问题
- 坐标转换错误

**解决方案**:
- 确保GPS数据使用WGS84坐标系
- 检查GPS数据的准确性
- 验证坐标转换逻辑

### 13.3 性能问题

**问题**: 地图加载慢或卡顿

**可能原因**:
- GPS点数量过多
- 网络连接缓慢
- 设备性能不足

**解决方案**:
- 优化GPS数据，减少点数量
- 使用数据抽稀算法
- 优化地图加载逻辑

## 14. 总结

ColaFit 地图功能提供了强大的活动轨迹可视化能力，支持跨平台使用，并具有良好的扩展性。通过集成高德地图API和自定义代理服务，实现了安全、高效的地图服务。未来将继续优化性能，添加更多功能，提升用户体验。
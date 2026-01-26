// 高德地图安全配置文件
// ⚠️ 请将下方的 key 替换为您的真实高德地图 Key

// WGS84转GCJ-02坐标系转换函数
function wgs84ToGcj02(lng, lat) {
    if (outOfChina(lng, lat)) return { lng, lat };
    
    const dLat = transformLat(lng - 105.0, lat - 35.0);
    const dLng = transformLng(lng - 105.0, lat - 35.0);
    const radLat = lat / 180.0 * Math.PI;
    const magic = Math.sin(radLat);
    const sqrtMagic = Math.sqrt(1 - 0.006693421622965943 * magic * magic);
    
    const dLatConv = (dLat * 180.0) / ((6378245.0 / sqrtMagic) * Math.PI);
    const dLngConv = (dLng * 180.0) / ((6378245.0 / sqrtMagic) * Math.cos(radLat) * Math.PI);
    
    return {
        lng: lng + dLngConv,
        lat: lat + dLatConv
    };
}

function transformLat(lng, lat) {
    let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
    ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(lat * Math.PI) + 40.0 * Math.sin(lat / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(lat / 12.0 * Math.PI) + 320 * Math.sin(lat * Math.PI / 30.0)) * 2.0 / 3.0;
    return ret;
}

function transformLng(lng, lat) {
    let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
    ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(lng * Math.PI) + 40.0 * Math.sin(lng / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(lng / 12.0 * Math.PI) + 300.0 * Math.sin(lng / 30.0 * Math.PI)) * 2.0 / 3.0;
    return ret;
}

function outOfChina(lng, lat) {
    return lng < 73.66 || lng > 135.05 || lat < 3.86 || lat > 53.55;
}

// 使用AMapLoader加载高德地图API
AMapLoader.load({
    version: "2.0",
    plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.MapType', 'AMap.Polyline', 'AMap.Marker'],
    // ✅ 使用真实key加载SDK（Key本身可以公开）
    // ⚠️ 请替换为您的真实Key
    key: "480294b8e2302bda9c80df150f6da88b"
    // 注意：安全密钥不在这里配置，会通过 serviceHost 代理自动添加
}).then((AMap) => {
    
    window.amapLoaded = true;
    window.AMap = AMap;
    
    // 初始化地图函数
    window.initAMap = function(points) {
        
        const gpsPoints = points || window.gpsPoints || [];
        
        if (!gpsPoints || !Array.isArray(gpsPoints) || gpsPoints.length === 0) {
            return;
        }
        
        let mapContainer = document.getElementById('mapContainer');
        
        if (!mapContainer) {
            return;
        }
        
        // 确保容器样式正确
        if (!mapContainer.style.position || mapContainer.style.position === 'static') {
            mapContainer.style.position = 'relative';
        }
        
        // 检查或创建子容器
        let amapContainer = mapContainer.querySelector('#amapContainer');
        if (!amapContainer) {
            amapContainer = document.createElement('div');
            amapContainer.id = 'amapContainer';
            amapContainer.style.cssText = 'width:100%;height:100%;position:absolute;top:0;left:0;z-index:10';
            mapContainer.appendChild(amapContainer);
        }
        
        mapContainer = amapContainer;
        
        // 数据转换
        const validPoints = [];
        let centerLat = 0, centerLng = 0;
        
        for (const point of gpsPoints) {
            let lng, lat;
            
            // 识别不同的数据格式
            if (point.lng !== undefined && point.lat !== undefined) {
                lng = point.lng;
                lat = point.lat;
            } else if (point.longitude !== undefined && point.latitude !== undefined) {
                lng = point.longitude;
                lat = point.latitude;
            } else if (Array.isArray(point) && point.length >= 2) {
                lng = point[0];
                lat = point[1];
            } else {
                continue;
            }
            
            if (isNaN(lng) || isNaN(lat)) continue;
            
            // FIT文件坐标转换（semicircles -> degrees）
            if (Math.abs(lng) > 1000 || Math.abs(lat) > 1000) {
                const fitFactor = 180 / Math.pow(2, 31);
                lng *= fitFactor;
                lat *= fitFactor;
            }
            
            // WGS84 -> GCJ-02
            const gcjResult = wgs84ToGcj02(lng, lat);
            lng = gcjResult.lng;
            lat = gcjResult.lat;
            
            // 验证坐标范围
            if (lng >= 70 && lng <= 140 && lat >= 15 && lat <= 55) {
                validPoints.push([lng, lat]);
                centerLng += lng;
                centerLat += lat;
            }
        }
        
        if (validPoints.length === 0) {
            console.error('没有有效的GPS坐标点');
            mapContainer.innerHTML = '<p style="color:var(--color-text-secondary);text-align:center;padding:2rem;">无有效GPS数据</p>';
            return;
        }
        
        centerLng /= validPoints.length;
        centerLat /= validPoints.length;
        

        
        // 创建地图
        const map = new AMap.Map(mapContainer, {
            zoom: 13,
            center: [centerLng, centerLat],
            mapStyle: 'amap://styles/normal'
        });
        
        // 添加控件
        map.addControl(new AMap.Scale());
        map.addControl(new AMap.ToolBar());
        map.addControl(new AMap.MapType());
        
        // 绘制路线
        const polyline = new AMap.Polyline({
            path: validPoints,
            strokeColor: '#4285f4',
            strokeWeight: 4,
            strokeOpacity: 0.8
        });
        
        map.add(polyline);
        map.setFitView();
        
        // 添加起点终点标记
        if (validPoints.length > 0) {
            const startMarker = new AMap.Marker({
                position: validPoints[0],
                title: '起点',
                icon: new AMap.Icon({
                    size: new AMap.Size(25, 34),
                    image: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-default.png'
                })
            });
            
            const endMarker = new AMap.Marker({
                position: validPoints[validPoints.length - 1],
                title: '终点',
                icon: new AMap.Icon({
                    size: new AMap.Size(25, 34),
                    image: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-red.png'
                })
            });
            
            map.add([startMarker, endMarker]);
        }
        

        
        window.dispatchEvent(new CustomEvent('amapReady', { 
            detail: { map, points: gpsPoints } 
        }));
    };
    
    // 执行延迟的初始化请求
    if (window.pendingMapInit && window.pendingMapInit.length > 0) {
        window.pendingMapInit.forEach(args => window.initAMap.apply(null, args));
        window.pendingMapInit = null;
    }
    
    // 触发回调
    if (typeof window.onAmapLoaded === 'function') {
        window.onAmapLoaded();
    }
    
}).catch((error) => {
    console.error('高德地图API加载失败:', error);
    const mapContainer = document.getElementById('mapContainer');
    if (mapContainer) {
        mapContainer.innerHTML = '<p style="color:var(--color-danger-500);text-align:center;padding:2rem;">地图加载失败，请检查网络连接</p>';
    }
});


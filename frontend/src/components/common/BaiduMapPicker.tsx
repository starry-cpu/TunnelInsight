// frontend/src/components/common/BaiduMapPicker.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input, Alert, message } from 'antd';
import { EnvironmentOutlined, SearchOutlined, LoadingOutlined } from '@ant-design/icons';
import type { MapLocation } from '../../types/common.types';

interface BaiduMapPickerProps {
  value?: MapLocation;
  onChange: (location: MapLocation) => void;
  placeholder?: string;
  height?: number;
  disabled?: boolean;
}

// 扩展 Window 类型
declare global {
  interface Window {
    BMapGL: typeof BMapGL;
  }
}

type WindowWithCallbackRegistry = Window & Record<string, (() => void) | typeof BMapGL | undefined>;

const BaiduMapPicker: React.FC<BaiduMapPickerProps> = ({
  value,
  onChange,
  placeholder = '搜索地址或在地图上点击选择位置',
  height = 350,
  disabled = false,
}) => {
  const baiduMapAk = import.meta.env.VITE_BAIDU_MAP_AK;

  // 状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<MapLocation | null>(value || null);
  const [searchText, setSearchText] = useState(value?.address || '');

  // Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<BMapGL.Map | null>(null);
  const markerRef = useRef<BMapGL.Marker | null>(null);
  const isInitializedRef = useRef(false);

  // 逆地理编码
  const reverseGeocode = useCallback((point: BMapGL.Point, callback: (address: string) => void) => {
    if (!window.BMapGL) {
      callback('');
      return;
    }
    try {
      const geocoder = new window.BMapGL.Geocoder();
      geocoder.getLocation(point, (result) => {
        const address = result?.business || result?.address || '';
        callback(address);
      });
    } catch {
      callback('');
    }
  }, []);

  // 添加或更新标注
  const updateMarker = useCallback((point: BMapGL.Point, map: BMapGL.Map) => {
    if (!window.BMapGL) return;
    try {
      if (markerRef.current) {
        map.removeOverlay(markerRef.current);
      }
      const marker = new window.BMapGL.Marker(point);
      map.addOverlay(marker);
      markerRef.current = marker;
    } catch {
      // 忽略错误
    }
  }, []);

  // 更新位置并通知父组件
  const updateLocation = useCallback((location: MapLocation) => {
    setCurrentLocation(location);
    setSearchText(location.address || '');
    onChange(location);
  }, [onChange]);

  // 函数引用 - 用于在 useEffect 中访问最新版本
  const currentLocationRef = useRef(currentLocation);
  const reverseGeocodeRef = useRef(reverseGeocode);
  const updateMarkerRef = useRef(updateMarker);
  const updateLocationRef = useRef(updateLocation);

  // 保持 refs 更新
  useEffect(() => {
    currentLocationRef.current = currentLocation;
  }, [currentLocation]);

  useEffect(() => {
    reverseGeocodeRef.current = reverseGeocode;
  }, [reverseGeocode]);

  useEffect(() => {
    updateMarkerRef.current = updateMarker;
  }, [updateMarker]);

  useEffect(() => {
    updateLocationRef.current = updateLocation;
  }, [updateLocation]);

  // 搜索地址
  const handleSearch = useCallback(() => {
    if (!searchText.trim() || !window.BMapGL || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const localSearch = new window.BMapGL.LocalSearch(map, {
      onSearchComplete: (results: { getCurrentNumPois: () => number; getPoi: (index: number) => { point: BMapGL.Point; title: string } | null }) => {
        const numPois = results.getCurrentNumPois();
        if (numPois > 0) {
          const poi = results.getPoi(0);
          if (poi) {
            const point = poi.point;
            reverseGeocode(point, (address) => {
              const location: MapLocation = {
                longitude: point.lng,
                latitude: point.lat,
                address: address || poi.title || searchText,
              };
              updateMarker(point, map);
              map.centerAndZoom(point, 15);
              updateLocation(location);
            });
          }
        } else {
          message.warning('未找到搜索结果');
        }
      },
    });
    localSearch.search(searchText);
  }, [searchText, reverseGeocode, updateMarker, updateLocation]);

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 处理搜索文本变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  // 加载百度地图 SDK
  useEffect(() => {
    if (!baiduMapAk || isInitializedRef.current) return;

    // 等待 DOM 准备好
    const checkContainer = () => {
      if (!mapContainerRef.current) {
        requestAnimationFrame(checkContainer);
        return;
      }

      let mounted = true;
      const callbackName = `initBaiduMap_${Date.now()}`;

      const initMap = () => {
        if (!mounted || !mapContainerRef.current || isInitializedRef.current) return;

        try {
          isInitializedRef.current = true;

          const loc = currentLocationRef.current;
          const centerLng = loc?.longitude || 116.404;
          const centerLat = loc?.latitude || 39.915;
          const zoom = loc ? 15 : 5;

          const map = new window.BMapGL.Map(mapContainerRef.current);
          const centerPoint = new window.BMapGL.Point(centerLng, centerLat);

          map.centerAndZoom(centerPoint, zoom);
          map.enableScrollWheelZoom(true);

          // 添加控件
          map.addControl(new window.BMapGL.ScaleControl());
          map.addControl(new window.BMapGL.ZoomControl());

          mapInstanceRef.current = map;

          // 如果有初始位置，添加标注
          if (loc) {
            updateMarkerRef.current(centerPoint, map);
          }

          // 监听点击事件
          map.addEventListener('click', (e: { latlng: BMapGL.Point }) => {
            const point = e.latlng;
            reverseGeocodeRef.current(point, (address) => {
              const location: MapLocation = {
                longitude: point.lng,
                latitude: point.lat,
                address,
              };
              updateMarkerRef.current(point, map);
              updateLocationRef.current(location);
            });
          });

          setLoading(false);
        } catch (err) {
          if (mounted) {
            console.error('Map init error:', err);
            setError(err instanceof Error ? err.message : '地图初始化失败');
            setLoading(false);
          }
        }
      };

      // 检查 SDK 是否已加载
      if (window.BMapGL) {
        initMap();
      } else {
        // 设置全局回调函数
        const callbackWindow = window as unknown as WindowWithCallbackRegistry;
        callbackWindow[callbackName] = initMap;

        const script = document.createElement('script');
        script.src = `https://api.map.baidu.com/api?v=1.0&type=webgl&ak=${baiduMapAk}&callback=${callbackName}`;
        script.async = true;

        const timeout = setTimeout(() => {
          if (mounted) {
            console.error('Map SDK load timeout');
            setError('百度地图 SDK 加载超时');
            setLoading(false);
          }
        }, 15000);

        script.onload = () => {
          clearTimeout(timeout);
        };

        script.onerror = () => {
          clearTimeout(timeout);
          if (mounted) {
            console.error('Map SDK load error');
            setError('百度地图 SDK 加载失败，请检查网络连接');
            setLoading(false);
          }
        };

        document.head.appendChild(script);
      }

      return () => {
        mounted = false;
        const callbackWindow = window as unknown as WindowWithCallbackRegistry;
        delete callbackWindow[callbackName];
      };
    };

    const rafId = requestAnimationFrame(checkContainer);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [baiduMapAk]); // 只在 AK 变化时重新加载

  // 当外部 value 变化时更新地图（用于编辑模式）
  useEffect(() => {
    if (value && mapInstanceRef.current && window.BMapGL) {
      const point = new window.BMapGL.Point(value.longitude, value.latitude);
      const map = mapInstanceRef.current;

      reverseGeocodeRef.current(point, (address) => {
        const location: MapLocation = {
          ...value,
          address: value.address || address,
        };
        map.centerAndZoom(point, 15);
        updateMarkerRef.current(point, map);
        setCurrentLocation(location);
        setSearchText(location.address || '');
      });
    }
    // 使用 refs 避免依赖函数，只在坐标变化时触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.longitude, value?.latitude]);

  // 如果没有配置 AK, 显示提示
  if (!baiduMapAk) {
    return (
      <Alert
        type="warning"
        message="地图功能未配置"
        description="请在 .env.development 中配置 VITE_BAIDU_MAP_AK"
        showIcon
      />
    );
  }

  return (
    <div className="baidu-map-picker">
      {/* 搜索框 */}
      <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
        <Input
          placeholder={placeholder}
          prefix={<EnvironmentOutlined />}
          suffix={
            <SearchOutlined
              style={{ cursor: 'pointer', color: '#1890ff' }}
              onClick={handleSearch}
            />
          }
          value={searchText}
          onChange={handleSearchChange}
          onKeyPress={handleKeyPress}
          disabled={disabled || loading}
          allowClear
        />
      </div>

      {/* 地图容器 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height,
          border: '1px solid #d9d9d9',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        {/* 加载状态 */}
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.9)',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LoadingOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <span style={{ color: '#666' }}>地图加载中...</span>
            </div>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fff',
              zIndex: 10,
              padding: 20,
            }}
          >
            <Alert type="error" message="地图加载失败" description={error} showIcon />
          </div>
        )}

        {/* 地图 */}
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </div>

      {/* 坐标显示 */}
      {currentLocation && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: '#888',
          }}
        >
          经度: {currentLocation.longitude.toFixed(6)}, 纬度: {currentLocation.latitude.toFixed(6)}
        </div>
      )}
    </div>
  );
};

export default BaiduMapPicker;

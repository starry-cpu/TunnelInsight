// frontend/src/hooks/useBaiduMap.ts
import { useState, useEffect, useRef, useCallback, type RefObject } from 'react';
import type { MapLocation } from '../types';

// 扩展 Window 类型
declare global {
  interface Window {
    BMapGL: typeof BMapGL;
    baiduMapInit?: () => void;
    initBaiduMap?: () => void;
  }
}

type WindowWithCallbackRegistry = Window & Record<string, (() => void) | typeof BMapGL | undefined>;

interface UseBaiduMapOptions {
  ak: string;
  defaultLocation?: MapLocation;
  onLocationChange?: (location: MapLocation) => void;
}

interface UseBaiduMapReturn {
  mapRef: RefObject<HTMLDivElement | null>;
  mapInstance: BMapGL.Map | null;
  loading: boolean;
  error: string | null;
  currentLocation: MapLocation | null;
  setLocation: (location: MapLocation) => void;
  isSDKReady: boolean;
}

// 默认中心位置（中国中心）
const DEFAULT_CENTER = { longitude: 116.404, latitude: 39.915 };
const DEFAULT_ZOOM = 5;

export function useBaiduMap(options: UseBaiduMapOptions): UseBaiduMapReturn {
  const { ak, defaultLocation, onLocationChange } = options;

  const mapRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<MapLocation | null>(
    defaultLocation || null
  );
  const [isSDKReady, setIsSDKReady] = useState(false);
  const [mapInstance, setMapInstance] = useState<BMapGL.Map | null>(null);

  // 地图和标注实例引用
  const mapInstanceRef = useRef<BMapGL.Map | null>(null);
  const markerRef = useRef<BMapGL.Marker | null>(null);
  const isInitializedRef = useRef(false);

  // 动态加载百度地图 SDK
  const loadSDK = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      // 检查是否已经加载
      if (window.BMapGL && mapInstanceRef.current === null === false) {
        resolve();
        return;
      }

      // 如果 script 标签已存在，等待加载完成
      const existingScript = document.querySelector(`script[src*="api.map.baidu.com"]`);
      if (existingScript && window.BMapGL) {
        resolve();
        return;
      }

      // 创建唯一回调函数名
      const callbackName = `initBaiduMap_${Date.now()}`;

      const script = document.createElement('script');
      script.src = `https://api.map.baidu.com/api?v=1.0&type=webgl&ak=${ak}&callback=${callbackName}`;
      script.async = true;

      const timeout = setTimeout(() => {
        reject(new Error('百度地图 SDK 加载超时（15秒）'));
      }, 15000);

      // 设置回调函数
      const callbackWindow = window as unknown as WindowWithCallbackRegistry;
      callbackWindow[callbackName] = () => {
        clearTimeout(timeout);
        resolve();
        // 清理回调
        delete callbackWindow[callbackName];
      };

      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('百度地图 SDK 加载失败，请检查网络连接或 AK 配置'));
      };

      document.head.appendChild(script);
    });
  }, [ak]);

  // 逆地理编码
  const reverseGeocode = useCallback(
    (point: BMapGL.Point, callback: (address: string) => void) => {
      if (!window.BMapGL) return;
      try {
        const geocoder = new window.BMapGL.Geocoder();
        geocoder.getLocation(point, (result) => {
          const address = result?.business || result?.address || '';
          callback(address);
        });
      } catch {
        callback('');
      }
    },
    []
  );

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

  // 设置位置
  const setLocation = useCallback(
    (location: MapLocation) => {
      if (!mapInstanceRef.current || !window.BMapGL) return;

      try {
        const point = new window.BMapGL.Point(location.longitude, location.latitude);
        const map = mapInstanceRef.current;

        map.centerAndZoom(point, 15);
        updateMarker(point, map);
        setCurrentLocation(location);
        onLocationChange?.(location);
      } catch {
        // 忽略错误
      }
    },
    [updateMarker, onLocationChange]
  );

  // 初始化地图
  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      // 防止重复初始化
      if (isInitializedRef.current) return;

      try {
        await loadSDK();
        if (!mounted || !mapRef.current || isInitializedRef.current) return;

        isInitializedRef.current = true;

        const centerLng = currentLocation?.longitude || DEFAULT_CENTER.longitude;
        const centerLat = currentLocation?.latitude || DEFAULT_CENTER.latitude;
        const zoom = currentLocation ? 15 : DEFAULT_ZOOM;

        const map = new window.BMapGL.Map(mapRef.current);
        const centerPoint = new window.BMapGL.Point(centerLng, centerLat);

        map.centerAndZoom(centerPoint, zoom);
        map.enableScrollWheelZoom(true);

        // 添加地图控件
        map.addControl(new window.BMapGL.ScaleControl());
        map.addControl(new window.BMapGL.ZoomControl());

        mapInstanceRef.current = map;
        setMapInstance(map);

        // 如果有初始位置，添加标注
        if (currentLocation) {
          updateMarker(centerPoint, map);
        }

        // 监听点击事件
        map.addEventListener('click', (e: { latlng: BMapGL.Point }) => {
          const point = e.latlng;

          reverseGeocode(point, (address) => {
            const location: MapLocation = {
              longitude: point.lng,
              latitude: point.lat,
              address,
            };
            updateMarker(point, map);
            setCurrentLocation(location);
            onLocationChange?.(location);
          });
        });

        setIsSDKReady(true);
        setLoading(false);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : '地图初始化失败');
          setLoading(false);
        }
      }
    };

    initMap();

    return () => {
      mounted = false;
    };
  }, []); // 只在挂载时执行一次

  // 当 defaultLocation 变化时更新地图（用于编辑模式）
  useEffect(() => {
    if (isSDKReady && defaultLocation && mapInstanceRef.current) {
      try {
        const point = new window.BMapGL.Point(defaultLocation.longitude, defaultLocation.latitude);
        const map = mapInstanceRef.current;

        reverseGeocode(point, (address) => {
          const location: MapLocation = {
            ...defaultLocation,
            address: defaultLocation.address || address,
          };
          map.centerAndZoom(point, 15);
          updateMarker(point, map);
          setCurrentLocation(location);
        });
      } catch {
        // 忽略错误
      }
    }
  }, [isSDKReady, defaultLocation, updateMarker, reverseGeocode]);

  return {
    mapRef,
    mapInstance,
    loading,
    error,
    currentLocation,
    setLocation,
    isSDKReady,
  };
}

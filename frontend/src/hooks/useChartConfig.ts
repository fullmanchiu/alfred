/**
 * 图表配置管理 Hook
 * Chart Configuration State Management
 */

import { useState, useEffect, useCallback } from 'react';
import { ChartConfig, DEFAULT_CHART_CONFIG } from '@/types/chart';
import { getToken } from '@/utils/auth';

const CONFIG_STORAGE_KEY = 'stock_chart_config';
const CONFIG_API = '/api/v1/stocks/chart-config';

/**
 * 图表配置管理 Hook
 */
export const useChartConfig = () => {
  const [config, setConfig] = useState<ChartConfig>(DEFAULT_CHART_CONFIG);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  /**
   * 从localStorage加载配置
   */
  const loadFromLocalStorage = useCallback((): ChartConfig | null => {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as ChartConfig;
      }
    } catch (err) {
      console.error('加载本地配置失败:', err);
    }
    return null;
  }, []);

  /**
   * 保存配置到localStorage
   */
  const saveToLocalStorage = useCallback((config: ChartConfig) => {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (err) {
      console.error('保存本地配置失败:', err);
    }
  }, []);

  /**
   * 从后端加载配置
   */
  const loadFromBackend = useCallback(async (): Promise<ChartConfig | null> => {
    try {
      const token = getToken();
      const response = await fetch(CONFIG_API, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.config) {
          return result.data.config as ChartConfig;
        }
      }
    } catch (err) {
      console.error('加载后端配置失败:', err);
    }
    return null;
  }, []);

  /**
   * 保存配置到后端
   */
  const saveToBackend = useCallback(async (config: ChartConfig): Promise<boolean> => {
    try {
      const token = getToken();
      const response = await fetch(CONFIG_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.success;
      }
    } catch (err) {
      console.error('保存后端配置失败:', err);
    }
    return false;
  }, []);

  /**
   * 初始化配置（优先后端，其次本地，最后默认）
   */
  const initConfig = useCallback(async () => {
    setLoading(true);

    // 先尝试从后端加载
    const backendConfig = await loadFromBackend();
    if (backendConfig) {
      setConfig(backendConfig);
      saveToLocalStorage(backendConfig);
    } else {
      // 后端没有配置，尝试从本地加载
      const localConfig = loadFromLocalStorage();
      if (localConfig) {
        setConfig(localConfig);
      } else {
        // 使用默认配置
        setConfig(DEFAULT_CHART_CONFIG);
        saveToLocalStorage(DEFAULT_CHART_CONFIG);
      }
    }

    setInitialized(true);
    setLoading(false);
  }, [loadFromBackend, loadFromLocalStorage, saveToLocalStorage]);

  /**
   * 更新配置并自动保存
   */
  const updateConfig = useCallback(async (newConfig: Partial<ChartConfig>) => {
    const updatedConfig = {
      ...config,
      ...newConfig,
      // 深度合并嵌套对象
      mainChart: { ...config.mainChart, ...newConfig.mainChart },
      subChart: { ...config.subChart, ...newConfig.subChart },
      indicatorParams: {
        ...config.indicatorParams,
        ...newConfig.indicatorParams,
      },
    };

    setConfig(updatedConfig);
    saveToLocalStorage(updatedConfig);
    await saveToBackend(updatedConfig);
  }, [config, saveToLocalStorage, saveToBackend]);

  /**
   * 更新主图配置
   */
  const updateMainChart = useCallback(async (mainChart: Partial<ChartConfig['mainChart']>) => {
    await updateConfig({ mainChart: { ...config.mainChart, ...mainChart } });
  }, [config, updateConfig]);

  /**
   * 更新副图配置
   */
  const updateSubChart = useCallback(async (subChart: Partial<ChartConfig['subChart']>) => {
    await updateConfig({ subChart: { ...config.subChart, ...subChart } });
  }, [config, updateConfig]);

  /**
   * 更新指标参数
   */
  const updateIndicatorParams = useCallback(async (params: Partial<ChartConfig['indicatorParams']>) => {
    await updateConfig({
      indicatorParams: { ...config.indicatorParams, ...params },
    });
  }, [config, updateConfig]);

  /**
   * 切换副图指标
   */
  const switchSubChartIndicator = useCallback(async (index: number, indicatorId: string) => {
    if (index < 0 || index >= config.subChart.count) return;

    const newSubCharts = [...config.subChart.subCharts];
    newSubCharts[index] = { indicatorId, enabled: true };

    await updateSubChart({ subCharts: newSubCharts });
  }, [config.subChart, updateSubChart]);

  /**
   * 恢复默认配置
   */
  const resetConfig = useCallback(async () => {
    try {
      const token = getToken();
      await fetch(`${CONFIG_API}/reset`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      setConfig(DEFAULT_CHART_CONFIG);
      saveToLocalStorage(DEFAULT_CHART_CONFIG);
    } catch (err) {
      console.error('重置配置失败:', err);
    }
  }, [saveToLocalStorage]);

  // 组件挂载时初始化配置
  useEffect(() => {
    if (!initialized) {
      initConfig();
    }
  }, [initialized, initConfig]);

  return {
    config,
    loading,
    initialized,
    updateConfig,
    updateMainChart,
    updateSubChart,
    updateIndicatorParams,
    switchSubChartIndicator,
    resetConfig,
  };
};

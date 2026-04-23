import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Button,
  Space,
  message,
  Spin,
  Card,
  Typography,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useUIStore } from '../stores';
import { useSearchParams } from 'react-router-dom';
import AccountSecurityCard from '../components/settings/AccountSecurityCard';
import AppearanceCard from '../components/settings/AppearanceCard';
import NotificationCard from '../components/settings/NotificationCard';
import AlertSettingsCard from '../components/settings/AlertSettingsCard';
import SystemConfigCard from '../components/settings/SystemConfigCard';
import SeverityConfigCard from '../components/settings/SeverityConfigCard';
import StatusConfigCard from '../components/settings/StatusConfigCard';
import type { NotificationSettings } from '../types';
import './SettingsPage.css';

const { Title } = Typography;

type TabKey = 'account' | 'appearance' | 'notifications' | 'alerts' | 'system' | 'severity' | 'status';

const SettingsPage: React.FC = () => {
  const { theme, locale, setTheme, setLocale } = useUIStore();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('account');
  const [hasChanges, setHasChanges] = useState(false);

  // Read tab from URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['account', 'appearance', 'notifications', 'alerts', 'system', 'severity', 'status'].includes(tabParam)) {
      setActiveTab(tabParam as TabKey);
    }
  }, [searchParams]);

  // Mock notification settings
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      email: {
        enabled: true,
        alerts: true,
        reports: true,
        system_updates: false,
      },
      push: {
        enabled: false,
        alerts: false,
        reports: false,
        system_updates: false,
      },
      frequency: 'weekly',
    });

  // Mock alert threshold
  const [alertThreshold, setAlertThreshold] = useState(5);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      // TODO: Call API to save settings
      setHasChanges(false);
      message.success('设置已保存');
    } catch (error) {
      console.error('Failed to save settings:', error);
      message.error('保存设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    // Reset to default values
    message.info('设置已重置为默认值');
  };

  const handleAppearanceChange = (key: string, value: string) => {
    if (key === 'theme') {
      setTheme(value as 'light' | 'dark');
    } else if (key === 'locale') {
      setLocale(value as 'zh-CN' | 'en-US');
    }
    setHasChanges(true);
  };

  const handleNotificationChange = (settings: NotificationSettings) => {
    setNotificationSettings(settings);
    setHasChanges(true);
  };

  const handleAlertChange = (key: string, value: number) => {
    if (key === 'alert_threshold') {
      setAlertThreshold(value);
      setHasChanges(true);
    }
  };

  const handleEditProfile = () => {
    message.info('编辑资料功能即将推出');
  };

  const handleChangePassword = () => {
    message.info('修改密码功能即将推出');
  };

  const handleRefreshConfigs = () => {
    message.info('刷新系统配置');
  };

  const tabItems = [
    {
      key: 'account',
      label: (
        <span>
          <SettingOutlined />
          账户与安全
        </span>
      ),
      children: (
        <AccountSecurityCard
          onEditProfile={handleEditProfile}
          onChangePassword={handleChangePassword}
        />
      ),
    },
    {
      key: 'appearance',
      label: (
        <span>
          <SettingOutlined />
          外观设置
        </span>
      ),
      children: (
        <AppearanceCard
          settings={{ theme, locale }}
          onChange={handleAppearanceChange}
        />
      ),
    },
    {
      key: 'notifications',
      label: (
        <span>
          <SettingOutlined />
          通知设置
        </span>
      ),
      children: (
        <NotificationCard
          settings={notificationSettings}
          onChange={handleNotificationChange}
        />
      ),
    },
    {
      key: 'alerts',
      label: (
        <span>
          <SettingOutlined />
          警报设置
        </span>
      ),
      children: (
        <AlertSettingsCard
          settings={{ alert_threshold: alertThreshold }}
          onChange={handleAlertChange}
        />
      ),
    },
    {
      key: 'system',
      label: (
        <span>
          <SettingOutlined />
          系统配置
        </span>
      ),
      children: <SystemConfigCard onRefresh={handleRefreshConfigs} />,
    },
    {
      key: 'severity',
      label: (
        <span>
          <SettingOutlined />
          严重程度配置
        </span>
      ),
      children: <SeverityConfigCard />,
    },
    {
      key: 'status',
      label: (
        <span>
          <SettingOutlined />
          状态等级配置
        </span>
      ),
      children: <StatusConfigCard />,
    },
  ];

  return (
    <div className="settings-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <Title level={2} className="page-title">
            系统设置
          </Title>
          <p className="page-subtitle">
            管理您的账户偏好、系统配置和通知设置
          </p>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
            disabled={!hasChanges}
          >
            重置
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={loading}
            disabled={!hasChanges}
          >
            保存设置
          </Button>
        </Space>
      </div>

      {/* Settings Tabs */}
      <Card className="settings-tabs-card">
        <Spin spinning={loading}>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as TabKey)}
            items={tabItems}
            tabPosition="left"
            style={{ minHeight: 600 }}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default SettingsPage;

import React from 'react';
import { Card, Switch, Space, Typography } from 'antd';
import type { NotificationSettings } from '../../types';
import './SettingsCard.css';

const { Text } = Typography;

interface NotificationCardProps {
  settings: NotificationSettings;
  onChange: (settings: NotificationSettings) => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  settings,
  onChange,
}) => {
  const handleEmailChange = (key: keyof NotificationSettings['email'], value: boolean) => {
    onChange({
      ...settings,
      email: {
        ...settings.email,
        [key]: value,
      },
    });
  };

  const handlePushChange = (key: keyof NotificationSettings['push'], value: boolean) => {
    onChange({
      ...settings,
      push: {
        ...settings.push,
        [key]: value,
      },
    });
  };

  return (
    <Card title="通知设置" className="settings-card">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Email Notifications */}
        <div className="setting-section">
          <div className="setting-header">
            <Text strong>邮件通知</Text>
            <Switch
              checked={settings.email.enabled}
              onChange={(checked) => handleEmailChange('enabled', checked)}
            />
          </div>
          <div className="setting-items">
            <div className="setting-item">
              <Text>缺陷警报</Text>
              <Switch
                checked={settings.email.alerts}
                onChange={(checked) => handleEmailChange('alerts', checked)}
                disabled={!settings.email.enabled}
              />
            </div>
            <div className="setting-item">
              <Text>定期报告</Text>
              <Switch
                checked={settings.email.reports}
                onChange={(checked) => handleEmailChange('reports', checked)}
                disabled={!settings.email.enabled}
              />
            </div>
            <div className="setting-item">
              <Text>系统更新</Text>
              <Switch
                checked={settings.email.system_updates}
                onChange={(checked) => handleEmailChange('system_updates', checked)}
                disabled={!settings.email.enabled}
              />
            </div>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="setting-section">
          <div className="setting-header">
            <Text strong>推送通知</Text>
            <Switch
              checked={settings.push.enabled}
              onChange={(checked) => handlePushChange('enabled', checked)}
            />
          </div>
          <div className="setting-items">
            <div className="setting-item">
              <Text>缺陷警报</Text>
              <Switch
                checked={settings.push.alerts}
                onChange={(checked) => handlePushChange('alerts', checked)}
                disabled={!settings.push.enabled}
              />
            </div>
            <div className="setting-item">
              <Text>定期报告</Text>
              <Switch
                checked={settings.push.reports}
                onChange={(checked) => handlePushChange('reports', checked)}
                disabled={!settings.push.enabled}
              />
            </div>
            <div className="setting-item">
              <Text>系统更新</Text>
              <Switch
                checked={settings.push.system_updates}
                onChange={(checked) => handlePushChange('system_updates', checked)}
                disabled={!settings.push.enabled}
              />
            </div>
          </div>
        </div>
      </Space>
    </Card>
  );
};

export default NotificationCard;

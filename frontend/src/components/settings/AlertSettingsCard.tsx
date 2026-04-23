import React from 'react';
import { Card, InputNumber, Space, Typography, Alert, Slider } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import type { UserSettings } from '../../types';
import './SettingsCard.css';

const { Text } = Typography;

interface AlertSettingsCardProps {
  settings: Pick<UserSettings, 'alert_threshold'>;
  onChange: (key: string, value: number) => void;
}

const AlertSettingsCard: React.FC<AlertSettingsCardProps> = ({
  settings,
  onChange,
}) => {
  const { alert_threshold } = settings;

  const getSeverityLevel = (threshold: number): { level: string; color: string } => {
    if (threshold >= 8) {
      return { level: '严格', color: '#ef4444' };
    } else if (threshold >= 5) {
      return { level: '中等', color: '#f59e0b' };
    } else {
      return { level: '宽松', color: '#10b981' };
    }
  };

  const severity = getSeverityLevel(alert_threshold);

  return (
    <Card
      title="警报设置"
      className="settings-card"
      extra={
        <Space>
          <Text type="secondary">严重等级:</Text>
          <Text strong style={{ color: severity.color }}>
            {severity.level}
          </Text>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Alert
          message="缺陷警报阈值"
          description="当检测到的缺陷严重程度达到或超过此阈值时，系统将发送警报通知"
          type="info"
          showIcon
          icon={<BellOutlined />}
        />

        <div className="setting-section">
          <div className="setting-header">
            <Text strong>警报阈值 (1-10)</Text>
          </div>
          <div className="setting-items">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Slider
                min={1}
                max={10}
                value={alert_threshold}
                onChange={(value) => onChange('alert_threshold', value)}
                marks={{
                  1: '1',
                  3: '3',
                  5: '5',
                  7: '7',
                  10: '10',
                }}
              />
              <Space>
                <Text>阈值:</Text>
                <InputNumber
                  min={1}
                  max={10}
                  value={alert_threshold}
                  onChange={(value) =>
                    onChange('alert_threshold', value || 5)
                  }
                />
                <Text type="secondary">
                  ({severity.level} - {severity.color === '#ef4444' ? '仅严重缺陷' : severity.color === '#f59e0b' ? '高严重性及以上' : '中等及以上'})
                </Text>
              </Space>
            </Space>
          </div>
        </div>
      </Space>
    </Card>
  );
};

export default AlertSettingsCard;

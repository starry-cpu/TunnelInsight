import React from 'react';
import { Card, Radio, Space, Typography, Divider } from 'antd';
import { BulbOutlined, TranslationOutlined } from '@ant-design/icons';
import type { UserSettings } from '../../types';
import './SettingsCard.css';

const { Text } = Typography;

interface AppearanceCardProps {
  settings: Pick<UserSettings, 'theme'> & { locale: string };
  onChange: (key: string, value: string) => void;
}

const AppearanceCard: React.FC<AppearanceCardProps> = ({ settings, onChange }) => {
  return (
    <Card title="外观设置" className="settings-card">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Theme */}
        <div className="setting-section">
          <div className="setting-header">
            <Space>
              <BulbOutlined />
              <Text strong>主题模式</Text>
            </Space>
          </div>
          <div className="setting-items">
            <Radio.Group
              value="light"
              disabled
              buttonStyle="solid"
            >
              <Radio.Button value="light">浅色模式</Radio.Button>
            </Radio.Group>
            <Text type="secondary" style={{ marginLeft: 12 }}>
              当前仅支持浅色主题
            </Text>
          </div>
        </div>

        <Divider />

        {/* Language */}
        <div className="setting-section">
          <div className="setting-header">
            <Space>
              <TranslationOutlined />
              <Text strong>语言设置</Text>
            </Space>
          </div>
          <div className="setting-items">
            <Radio.Group
              value={settings.locale}
              onChange={(e) => onChange('locale', e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="zh-CN">简体中文</Radio.Button>
              <Radio.Button value="en-US">English</Radio.Button>
            </Radio.Group>
          </div>
        </div>
      </Space>
    </Card>
  );
};

export default AppearanceCard;

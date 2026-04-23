import React from 'react';
import { Radio, Empty, Button, Spin } from 'antd';
import { EnvironmentOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Tunnel } from '../../types';
import './TunnelSelector.css';

interface TunnelSelectorProps {
  tunnels: Tunnel[];
  selected: Tunnel | null;
  loading: boolean;
  disabled?: boolean;
  onSelect: (tunnel: Tunnel) => void;
}

const TunnelSelector: React.FC<TunnelSelectorProps> = ({
  tunnels,
  selected,
  loading,
  disabled = false,
  onSelect,
}) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="tunnel-selector-loading">
        <Spin size="large" />
        <p>加载隧道列表中...</p>
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="tunnel-selector-empty">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <>
              <div className="empty-title">请先选择项目</div>
              <div className="empty-description">选择项目后将显示该项目的隧道列表</div>
            </>
          }
        />
      </div>
    );
  }

  if (tunnels.length === 0) {
    return (
      <div className="tunnel-selector-empty">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <>
              <div className="empty-title">暂无隧道</div>
              <div className="empty-description">请先创建隧道后再进行分析</div>
            </>
          }
        >
          <Button
            type="primary"
            onClick={() => navigate('/dashboard')}
          >
            前往创建隧道
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="tunnel-selector">
      <Radio.Group
        value={selected?.id}
        onChange={(e) => {
          const tunnel = tunnels.find(t => t.id === e.target.value);
          if (tunnel) onSelect(tunnel);
        }}
        className="tunnel-radio-group"
      >
        {tunnels.map(tunnel => (
          <Radio
            key={tunnel.id}
            value={tunnel.id}
            className="tunnel-radio-item"
          >
            <div className="tunnel-info">
              <div className="tunnel-name">{tunnel.name}</div>
              <div className="tunnel-meta">
                {tunnel.location && (
                  <span className="tunnel-location">
                    <EnvironmentOutlined /> {tunnel.location}
                  </span>
                )}
                {tunnel.total_defects !== undefined && tunnel.total_defects > 0 && (
                  <span className="tunnel-defects">
                    <WarningOutlined /> {tunnel.total_defects} 个缺陷
                  </span>
                )}
              </div>
            </div>
          </Radio>
        ))}
      </Radio.Group>
    </div>
  );
};

export default TunnelSelector;

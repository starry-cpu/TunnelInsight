import React from 'react';
import { Card, Tag, Progress, Button, Space } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { TunnelBrief } from '../../types';
import { useStatusConfig } from '../../hooks/useStatusConfig';
import './TunnelCard.css';

interface TunnelCardProps {
  tunnel: TunnelBrief;
  onView: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const TunnelCard: React.FC<TunnelCardProps> = ({
  tunnel,
  onView,
  onEdit,
  onDelete,
}) => {
  const { getStatusInfo } = useStatusConfig();
  const healthIndex = tunnel.health_index ?? 100;
  const statusInfo = getStatusInfo(healthIndex);

  return (
    <Card
      hoverable
      className="tunnel-card"
      onClick={() => onView(tunnel.id)}
    >
      {/* Header */}
      <div className="card-header">
        <h3 className="card-title">{tunnel.name}</h3>
        <Tag color={statusInfo.tagColor}>{statusInfo.label}</Tag>
      </div>

      {/* Location */}
      {tunnel.location && (
        <p className="card-location">{tunnel.location}</p>
      )}

      {/* Progress */}
      <div className="card-progress">
        <div className="progress-info">
          <span>健康指数</span>
          <span className="progress-value">{healthIndex}%</span>
        </div>
        <Progress
          percent={healthIndex}
          strokeColor={statusInfo.color}
          showInfo={false}
          size="small"
        />
      </div>

      {/* Stats */}
      <div className="card-stats">
        <div className="stat-item">
          <span className="stat-label">缺陷总数</span>
          <span className="stat-value">{tunnel.total_defects || 0}</span>
        </div>
        {tunnel.length_km && (
          <div className="stat-item">
            <span className="stat-label">全长</span>
            <span className="stat-value">{tunnel.length_km}km</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="card-footer">
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onView(tunnel.id);
            }}
          >
            详情
          </Button>
          {onEdit && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(tunnel.id);
              }}
            >
              编辑
            </Button>
          )}
          {onDelete && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(tunnel.id);
              }}
            >
              删除
            </Button>
          )}
        </Space>
      </div>
    </Card>
  );
};

export default TunnelCard;

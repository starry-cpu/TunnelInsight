import React from 'react';
import { Card, Tag, Typography, List, Alert, Skeleton } from 'antd';
import { BulbOutlined, BookOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { RepairSuggestion } from '../../types';
import './RepairSuggestionCard.css';

const { Paragraph, Text } = Typography;

interface RepairSuggestionCardProps {
  suggestion: RepairSuggestion;
  loading?: boolean;
  ragQueryTimeMs?: number;
}

/**
 * 修复建议卡片组件
 * 显示基于知识库的缺陷修复建议
 */
export const RepairSuggestionCard: React.FC<RepairSuggestionCardProps> = ({
  suggestion,
  loading = false,
  ragQueryTimeMs = 0,
}) => {
  if (loading) {
    return (
      <Card
        className="repair-suggestion-card"
        title={
          <span>
            <BulbOutlined style={{ marginRight: 8 }} />
            修复建议
          </span>
        }
      >
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  const confidencePercent = Math.round(suggestion.confidence * 100);
  const confidenceColor =
    confidencePercent >= 80 ? 'green' :
    confidencePercent >= 60 ? 'orange' : 'red';

  return (
    <Card
      className="repair-suggestion-card"
      title={
        <span>
          <BulbOutlined style={{ marginRight: 8 }} />
          修复建议
        </span>
      }
      extra={
        suggestion.fallback ? (
          <Tag color="orange">通用建议</Tag>
        ) : (
          <Tag color="green">知识库生成</Tag>
        )
      }
    >
      {suggestion.fallback && (
        <Alert
          message="知识库服务暂不可用"
          description="以下为通用修复建议，建议联系专业工程师进行详细评估"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Paragraph className="suggestion-text">
        {suggestion.suggestion}
      </Paragraph>

      {suggestion.sources && suggestion.sources.length > 0 && (
        <div className="sources-section">
          <Text type="secondary">
            <BookOutlined style={{ marginRight: 4 }} />
            参考来源：
          </Text>
          <List
            size="small"
            dataSource={suggestion.sources}
            renderItem={(item) => (
              <List.Item className="source-item">
                <Text ellipsis={{ tooltip: item }}>{item}</Text>
              </List.Item>
            )}
          />
        </div>
      )}

      <div className="suggestion-meta">
        <span className="confidence">
          <Text type="secondary">置信度: </Text>
          <Tag color={confidenceColor}>{confidencePercent}%</Tag>
        </span>

        {ragQueryTimeMs > 0 && (
          <span className="query-time">
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            <Text type="secondary">查询耗时: {ragQueryTimeMs}ms</Text>
          </span>
        )}
      </div>
    </Card>
  );
};

export default RepairSuggestionCard;

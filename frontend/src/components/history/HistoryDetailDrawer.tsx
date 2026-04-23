import React from 'react';
import { Drawer, Image, Tag, Descriptions, Button, Space } from 'antd';
import {
  DownloadOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import type { DefectRecord } from '../../types';
import dayjs from 'dayjs';
import { getImageUrl } from '../../utils/imageUrl';
import { useSeverityConfig } from '../../hooks/useSeverityConfig';
import './HistoryDetailDrawer.css';

interface HistoryDetailDrawerProps {
  visible: boolean;
  record: DefectRecord | null;
  onClose: () => void;
}

const HistoryDetailDrawer: React.FC<HistoryDetailDrawerProps> = ({
  visible,
  record,
  onClose,
}) => {
  const { getConfig } = useSeverityConfig();

  if (!record) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(record.final_result);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Drawer
      title="分析记录详情"
      placement="right"
      width={720}
      open={visible}
      onClose={onClose}
      className="history-detail-drawer"
    >
      {/* Image */}
      <div className="detail-section">
        <h3>原始图片</h3>
        <Image
          src={getImageUrl(record.image_path)}
          alt="defect"
          style={{ width: '100%', borderRadius: 8 }}
          placeholder
          fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23f0f0f0' width='100%25' height='100%25'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3E图片加载失败%3C/text%3E%3C/svg%3E"
        />
      </div>

      {/* Basic Info */}
      <div className="detail-section">
        <h3>基本信息</h3>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="分析时间">
            {dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="推理时间">
            {record.inference_time_ms}ms
          </Descriptions.Item>
          <Descriptions.Item label="模型">
            {record.model_used}
          </Descriptions.Item>
          <Descriptions.Item label="桩号">
            {record.stake_mark || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="方向">
            {(() => {
              const map: Record<string, string> = {
                left: '左侧', right: '右侧', top: '拱顶', bottom: '仰拱'
              };
              return map[record.direction || ''] || record.direction || '-';
            })()}
          </Descriptions.Item>
          <Descriptions.Item label="缺陷类型">
            {record.defect_type || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="严重程度" span={2}>
            {record.severity ? (
              <Tag color={getConfig(record.severity).color}>
                {getConfig(record.severity).text}
              </Tag>
            ) : '-'}
          </Descriptions.Item>
        </Descriptions>
      </div>

      {/* Analysis Parameters */}
      <div className="detail-section">
        <h3>分析参数</h3>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Temperature">
            {record.settings.temperature}
          </Descriptions.Item>
          <Descriptions.Item label="Top-K">
            {record.settings.top_k}
          </Descriptions.Item>
          <Descriptions.Item label="Top-P">
            {record.settings.top_p}
          </Descriptions.Item>
          <Descriptions.Item label="Max Tokens">
            {record.settings.max_tokens}
          </Descriptions.Item>
        </Descriptions>
      </div>

      {/* Analysis Result */}
      <div className="detail-section">
        <div className="section-header">
          <h3>分析结果</h3>
          <Space>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={handleCopy}
            >
              复制
            </Button>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => {}}
            >
              导出 PDF
            </Button>
          </Space>
        </div>
        <div className="result-content">
          <ReactMarkdown>{record.final_result}</ReactMarkdown>
        </div>
      </div>

      {/* Repair Suggestion - 仅当存在修复建议时显示 */}
      {record.repair_suggestion && (
        <div className="detail-section">
          <h3>修复建议</h3>
          <div className="result-content">
            <ReactMarkdown>{record.repair_suggestion}</ReactMarkdown>
          </div>
          {/* 引用来源（如有） */}
          {record.suggestion_sources && record.suggestion_sources.length > 0 && (
            <div className="rag-sources">
              <span className="rag-sources-label">引用来源:</span>
              {record.suggestion_sources.map((source, index) => (
                <span key={index} className="rag-source-tag">{source}</span>
              ))}
            </div>
          )}
          {/* RAG 元信息 */}
          {(record.rag_model_used || record.rag_query_time_ms) && (
            <div className="rag-meta">
              {record.rag_model_used && (
                <span className="rag-meta-item">模型: {record.rag_model_used}</span>
              )}
              {record.rag_query_time_ms && (
                <span className="rag-meta-item">查询耗时: {record.rag_query_time_ms}ms</span>
              )}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
};

export default HistoryDetailDrawer;

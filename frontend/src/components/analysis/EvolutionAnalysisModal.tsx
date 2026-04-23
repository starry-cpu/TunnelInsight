import React from 'react';
import { Modal, Descriptions, Progress, Tag, Image, Timeline, Spin } from 'antd';
import {
  AlertOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import type { EvolutionAnalysisResult } from '../../types';
import { getImageUrl } from '../../utils/imageUrl';
import './EvolutionAnalysisModal.css';

interface EvolutionAnalysisModalProps {
  visible: boolean;
  loading?: boolean;
  result: EvolutionAnalysisResult | null;
  onClose: () => void;
}

const directionMap: Record<string, string> = {
  left: '左侧',
  right: '右侧',
  top: '拱顶',
  bottom: '仰拱',
};

const riskLevelConfig: Record<string, { color: string; text: string }> = {
  low: { color: '#52c41a', text: '低风险' },
  medium: { color: '#faad14', text: '中等风险' },
  high: { color: '#ff4d4f', text: '高风险' },
  critical: { color: '#a8071a', text: '严重风险' },
};

const trendConfig: Record<string, { icon: React.ReactNode; color: string; text: string }> = {
  deteriorating: { icon: <ArrowDownOutlined />, color: '#ff4d4f', text: '恶化中' },
  stable: { icon: <MinusOutlined />, color: '#faad14', text: '稳定' },
  improving: { icon: <ArrowUpOutlined />, color: '#52c41a', text: '改善中' },
};

const EvolutionAnalysisModal: React.FC<EvolutionAnalysisModalProps> = ({
  visible,
  loading = false,
  result,
  onClose,
}) => {
  if (loading) {
    return (
      <Modal
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
        title="演变分析"
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16, color: '#666' }}>正在进行演变分析，请稍候...</p>
          <p style={{ color: '#999', fontSize: 12 }}>AI 分析通常需要 10-30 秒</p>
        </div>
      </Modal>
    );
  }

  if (!result) {
    return null;
  }

  const riskConfig = riskLevelConfig[result.scores.risk_level] || riskLevelConfig.medium;
  const trendConf = trendConfig[result.report.trend] || trendConfig.stable;

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
      title={`演变分析报告 - ${result.stake_mark} ${directionMap[result.direction] || result.direction}`}
      className="evolution-analysis-modal"
    >
      {/* 概览信息 */}
      <Descriptions bordered column={2} size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="位置">
          {result.stake_mark} {directionMap[result.direction] || result.direction}
        </Descriptions.Item>
        <Descriptions.Item label="时间范围">
          {result.time_range.start} 至 {result.time_range.end}
        </Descriptions.Item>
        <Descriptions.Item label="分析记录数">
          {result.records_analyzed} 条
        </Descriptions.Item>
        <Descriptions.Item label="分析时间">
          {new Date(result.created_at).toLocaleString('zh-CN')}
        </Descriptions.Item>
      </Descriptions>

      {/* 结构化评分 */}
      <div className="scores-section" style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 16 }}>
          <AlertOutlined style={{ marginRight: 8 }} />
          风险评估
        </h4>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150, textAlign: 'center' }}>
            <Progress
              type="dashboard"
              percent={result.scores.deterioration_rate * 10}
              strokeColor={result.scores.deterioration_rate >= 7 ? '#ff4d4f' : result.scores.deterioration_rate >= 4 ? '#faad14' : '#52c41a'}
              format={(percent) => `${(percent! / 10).toFixed(1)}`}
            />
            <div style={{ marginTop: 8 }}>恶化速度</div>
          </div>

          <div style={{ flex: 1, minWidth: 150, textAlign: 'center' }}>
            <div style={{ padding: '20px 0' }}>
              <Tag
                color={riskConfig.color}
                style={{ fontSize: 18, padding: '8px 24px', borderRadius: 4 }}
              >
                {riskConfig.text}
              </Tag>
            </div>
            <div style={{ marginTop: 8 }}>风险等级</div>
          </div>

          <div style={{ flex: 1, minWidth: 150, textAlign: 'center' }}>
            <Progress
              type="dashboard"
              percent={result.scores.urgency_score * 10}
              strokeColor={result.scores.urgency_score >= 7 ? '#ff4d4f' : result.scores.urgency_score >= 4 ? '#faad14' : '#52c41a'}
              format={(percent) => `${(percent! / 10).toFixed(1)}`}
            />
            <div style={{ marginTop: 8 }}>紧急程度</div>
          </div>

          <div style={{ flex: 1, minWidth: 150, textAlign: 'center' }}>
            <div style={{ padding: '20px 0' }}>
              <Tag
                icon={trendConf.icon}
                color={trendConf.color}
                style={{ fontSize: 16, padding: '8px 20px', borderRadius: 4 }}
              >
                {trendConf.text}
              </Tag>
            </div>
            <div style={{ marginTop: 8 }}>演变趋势</div>
          </div>
        </div>
      </div>

      {/* 详细报告 */}
      <div className="report-section" style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 16 }}>详细分析报告</h4>
        <div className="markdown-content" style={{
          padding: 16,
          background: '#fafafa',
          borderRadius: 8,
          maxHeight: 300,
          overflow: 'auto'
        }}>
          <ReactMarkdown>
            {`## 时间线总结\n${result.report.timeline_summary}\n\n## 演变原因分析\n${result.report.cause_analysis}\n\n## 修复优先级建议\n${result.report.repair_priority}\n\n## 未来发展趋势\n${result.report.future_prediction}`}
          </ReactMarkdown>
        </div>
      </div>

      {/* 时间线图片 */}
      <div className="timeline-section">
        <h4 style={{ marginBottom: 16 }}>缺陷演变时间线</h4>
        <Timeline
          items={result.records.map((record, index) => ({
            color: index === 0 ? 'green' : index === result.records.length - 1 ? 'red' : 'blue',
            children: (
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <Image
                  src={getImageUrl(record.image_path)}
                  alt={`defect-${index}`}
                  width={120}
                  height={80}
                  style={{ objectFit: 'cover', borderRadius: 4 }}
                  fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80'%3E%3Crect fill='%23f0f0f0' width='100%25' height='100%25'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3E加载失败%3C/text%3E%3C/svg%3E"
                />
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {new Date(record.created_at).toLocaleString('zh-CN')}
                  </div>
                  <div style={{ color: '#666', marginTop: 4 }}>
                    类型: {record.defect_type || '未知'} | 严重程度: {record.severity || '未知'}
                  </div>
                </div>
              </div>
            ),
          }))}
        />
      </div>
    </Modal>
  );
};

export default EvolutionAnalysisModal;

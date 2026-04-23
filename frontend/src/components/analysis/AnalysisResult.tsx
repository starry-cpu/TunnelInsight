import React from 'react';
import { Empty, Spin, Button, Space, Tag, Alert } from 'antd';
import { DownloadOutlined, CopyOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import type { RepairSuggestion } from '../../types';
import RepairSuggestionCard from './RepairSuggestionCard';
import './AnalysisResult.css';

interface AnalysisResultProps {
  loading?: boolean;
  result?: string;
  inferenceTime?: number;
  // RAG 修复建议
  repairSuggestion?: RepairSuggestion | null;
  ragAvailable?: boolean;
  ragQueryTimeMs?: number;
  onCopy?: () => void;
  onDownload?: () => void;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({
  loading = false,
  result,
  inferenceTime,
  repairSuggestion,
  ragAvailable = false,
  ragQueryTimeMs = 0,
  onCopy,
  onDownload,
}) => {
  if (loading) {
    return (
      <div className="analysis-result-loading">
        <Spin size="large" />
        <p className="loading-text">正在分析中，请稍候...</p>
        <p className="loading-hint">AI 模型推理通常需要 10-30 秒</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="analysis-result-empty">
        <Empty
          description="请上传图片并点击分析按钮"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      onCopy?.();
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="analysis-result">
      {/* Header - 操作栏 */}
      <div className="result-header">
        {inferenceTime && (
          <Tag color="blue">推理时间: {inferenceTime}ms</Tag>
        )}
        <div className="header-spacer" />
        <Space className="result-actions">
          <Button
            icon={<CopyOutlined />}
            size="small"
            onClick={handleCopy}
          >
            复制
          </Button>
          <Button
            icon={<DownloadOutlined />}
            size="small"
            onClick={onDownload}
          >
            导出 PDF
          </Button>
        </Space>
      </div>

      {/* Content - Markdown 渲染 */}
      <div className="result-content">
        <ReactMarkdown
          className="markdown-content"
          components={{
            h1: ({ children }) => <h1 className="md-h1">{children}</h1>,
            h2: ({ children }) => <h2 className="md-h2">{children}</h2>,
            h3: ({ children }) => <h3 className="md-h3">{children}</h3>,
            p: ({ children }) => <p className="md-p">{children}</p>,
            ul: ({ children }) => <ul className="md-ul">{children}</ul>,
            ol: ({ children }) => <ol className="md-ol">{children}</ol>,
            li: ({ children }) => <li className="md-li">{children}</li>,
            strong: ({ children }) => <strong className="md-strong">{children}</strong>,
            code: ({ className, children }) => {
              const match = /language-(\w+)/.exec(className || '');
              return match ? (
                <code className={`md-code-block md-language-${match[1]}`}>{children}</code>
              ) : (
                <code className="md-inline-code">{children}</code>
              );
            },
            table: ({ children }) => <div className="md-table-wrapper">{children}</div>,
          }}
        >
          {result}
        </ReactMarkdown>
      </div>

      {/* RAG 修复建议 */}
      {repairSuggestion && (
        <RepairSuggestionCard
          suggestion={repairSuggestion}
          ragQueryTimeMs={ragQueryTimeMs}
        />
      )}

      {/* RAG 服务不可用提示 */}
      {!ragAvailable && !repairSuggestion && (
        <Alert
          message="修复建议服务暂不可用"
          description="仅显示缺陷检测结果，请稍后重试获取修复建议"
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};

export default AnalysisResult;

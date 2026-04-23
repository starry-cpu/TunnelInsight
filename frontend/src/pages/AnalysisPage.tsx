import React, { useState, useEffect } from 'react';
import { Row, Col, Button, message, Card, Input, Radio } from 'antd';
import { ScanOutlined } from '@ant-design/icons';
import ImageUploader from '../components/analysis/ImageUploader';
import ProjectSelector from '../components/analysis/ProjectSelector';
import TunnelSelector from '../components/analysis/TunnelSelector';
import AnalysisResult from '../components/analysis/AnalysisResult';
import { defectsService, tunnelsService } from '../services';
import type { AnalysisSettings, Tunnel, RepairSuggestion, DefectAnalyzeResponse } from '../types';

interface ApiError {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}
import './AnalysisPage.css';

const AnalysisPage: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTunnel, setSelectedTunnel] = useState<Tunnel | null>(null);
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [loadingTunnels, setLoadingTunnels] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [inferenceTime, setInferenceTime] = useState<number>();
  const [repairSuggestion, setRepairSuggestion] = useState<RepairSuggestion | null>(null);
  const [ragAvailable, setRagAvailable] = useState(false);
  const [ragQueryTimeMs, setRagQueryTimeMs] = useState(0);
  const [stakeMark, setStakeMark] = useState<string>('');
  const [direction, setDirection] = useState<string>('');

  // 硬编码默认 AI 设置（用户无需配置）
  const DEFAULT_SETTINGS: AnalysisSettings = {
    temperature: 1.0,
    top_k: 10,
    max_tokens: 1024,
    top_p: 0.95,
    instruction: '你是一位土木工程领域的专家，请详细分析这张隧道缺陷图片，包括缺陷类型、严重程度、建议处理方案等。',
  };

  // 当选择项目时，加载该项目的隧道
  useEffect(() => {
    if (selectedProjectId) {
      setLoadingTunnels(true);
      tunnelsService.getTunnels({ project_id: selectedProjectId, limit: 100 })
        .then(res => setTunnels(res.items))
        .catch(err => {
          console.error('Failed to fetch tunnels:', err);
          message.error('获取隧道列表失败');
        })
        .finally(() => setLoadingTunnels(false));
    } else {
      setTunnels([]);
    }
    setSelectedTunnel(null); // 切换项目时清空已选隧道
  }, [selectedProjectId]);

  const handleAnalyze = async () => {
    if (!imageFile || !selectedTunnel) {
      message.warning('请选择项目、隧道并上传图片！');
      return;
    }

    setLoading(true);
    setResult('');
    setRepairSuggestion(null);
    setRagAvailable(false);
    setRagQueryTimeMs(0);

    try {
      const response = await defectsService.analyze({
        file: imageFile,
        tunnel_id: selectedTunnel.id,
        stake_mark: stakeMark || undefined,
        direction: direction || undefined,
        settings: DEFAULT_SETTINGS,
      }) as unknown as DefectAnalyzeResponse;

      setResult(response.final_result);
      setInferenceTime(response.inference_time_ms);
      setRepairSuggestion(response.repair_suggestion);
      setRagAvailable(response.rag_available);
      setRagQueryTimeMs(response.rag_query_time_ms);
      message.success('分析完成！');
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('Analysis failed:', error);
      message.error(apiError.response?.data?.error?.message || '分析失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    message.success('已复制到剪贴板');
  };

  const handleDownload = () => {
    message.info('PDF 导出功能开发中...');
  };

  const isAnalyzeDisabled = !selectedProjectId || !selectedTunnel || !imageFile || loading;

  return (
    <div className="analysis-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">缺陷分析</h1>
          <p className="page-subtitle">
            上传隧道图片，AI 模型将自动识别并分析缺陷类型、严重程度及处理建议
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Row gutter={24} className="analysis-content">
        {/* Left Panel - Project/Tunnel Selection and Upload */}
        <Col xs={24} md={10} lg={8} style={{ display: 'inline-block' }}>
          <Card title="1. 选择项目" className="upload-card" bordered={false}>
            <ProjectSelector
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              style={{ width: '100%' }}
            />
          </Card>

          <Card title="2. 选择隧道" className="upload-card" bordered={false}>
            <TunnelSelector
              tunnels={tunnels}
              selected={selectedTunnel}
              loading={loadingTunnels}
              onSelect={setSelectedTunnel}
              disabled={!selectedProjectId}
            />
          </Card>

          <Card title="3. 上传图片" className="upload-card" bordered={false}>
            <ImageUploader
              onChange={setImageFile}
              maxSize={10}
            />
          </Card>

          <Card title="4. 输入位置信息" className="upload-card" bordered={false}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8 }}>桩号</label>
              <Input
                placeholder="如 K12+345"
                value={stakeMark}
                onChange={(e) => setStakeMark(e.target.value)}
                allowClear
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8 }}>方向</label>
              <Radio.Group value={direction} onChange={(e) => setDirection(e.target.value)}>
                <Radio.Button value="left">左侧</Radio.Button>
                <Radio.Button value="right">右侧</Radio.Button>
                <Radio.Button value="top">拱顶</Radio.Button>
                <Radio.Button value="bottom">仰拱</Radio.Button>
              </Radio.Group>
            </div>
          </Card>

          <Card className="action-card" bordered={false}>
            <Button
              type="primary"
              size="large"
              icon={<ScanOutlined />}
              onClick={handleAnalyze}
              loading={loading}
              disabled={isAnalyzeDisabled}
              block
            >
              开始分析
            </Button>
          </Card>
        </Col>

        {/* Right Panel - Result */}
        <Col xs={24} md={14} lg={16} style={{ display: 'inline-block' }}>
          <Card
            className="result-card"
            bordered={false}
          >
            <AnalysisResult
              loading={loading}
              result={result}
              inferenceTime={inferenceTime}
              repairSuggestion={repairSuggestion}
              ragAvailable={ragAvailable}
              ragQueryTimeMs={ragQueryTimeMs}
              onCopy={handleCopy}
              onDownload={handleDownload}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AnalysisPage;

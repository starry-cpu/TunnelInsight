import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Spin,
  message,
  Tag,
  Statistic,
  Row,
  Col,
  Empty,
  Modal,
  Table,
  Upload,
  Select,
  Input,
  Form,
  Divider,
  Alert,
  App,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  UploadOutlined,
  ScanOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { tunnelsService, defectsService, historyService } from '../services';
import type { Tunnel, DefectRecord, DefectAnalyzeResponse, AnalysisSettings } from '../types';
import type { UploadFile } from 'antd/es/upload/interface';
import CreateTunnelModal from '../components/tunnels/CreateTunnelModal';
import RepairSuggestionCard from '../components/analysis/RepairSuggestionCard';
import { useSeverityConfig } from '../hooks/useSeverityConfig';
import './TunnelDetailPage.css';

interface ApiError {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}

const TunnelDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getConfig } = useSeverityConfig();
  const { modal } = App.useApp();
  const [tunnel, setTunnel] = useState<Tunnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<DefectRecord[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    bySeverity: {} as Record<string, number>,
    byType: {} as Record<string, number>,
  });
  const [editModalVisible, setEditModalVisible] = useState(false);

  // 上传分析相关状态
  const [analyzeModalVisible, setAnalyzeModalVisible] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [stakeMark, setStakeMark] = useState('');
  const [direction, setDirection] = useState<'left' | 'right' | 'top' | 'bottom'>('left');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DefectAnalyzeResponse | null>(null);

  const defaultSettings: AnalysisSettings = {
    temperature: 1.0,
    top_k: 10,
    max_tokens: 1024,
    top_p: 0.95,
    instruction: '你是一位土木工程领域的专家，专注于隧道结构缺陷的识别与评估。',
  };

  // 获取隧道详情
  const fetchTunnel = async () => {
    if (!id) {
      message.error('隧道ID不存在');
      navigate('/dashboard');
      return;
    }

    setLoading(true);
    try {
      const response = await tunnelsService.getTunnel(id);
      setTunnel(response);
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Failed to fetch tunnel:', apiError);
      message.error('加载隧道详情失败');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSuccess = (updatedTunnel: Tunnel) => {
    setEditModalVisible(false);
    setTunnel(updatedTunnel); // Update local state
  };

  // 获取该隧道的历史记录
  const fetchRecords = async () => {
    if (!id) return;
    try {
      const response = await historyService.getHistory({ tunnel_id: id, limit: 100 });
      const items = response.items || [];

      // 计算统计
      const bySeverity: Record<string, number> = {};
      const byType: Record<string, number> = {};

      items.forEach((record: DefectRecord) => {
        if (record.severity) {
          bySeverity[record.severity] = (bySeverity[record.severity] || 0) + 1;
        }
        if (record.defect_type) {
          byType[record.defect_type] = (byType[record.defect_type] || 0) + 1;
        }
      });

      setRecords(items);
      setStats({
        total: items.length,
        bySeverity,
        byType,
      });
    } catch (error) {
      console.error('Failed to fetch records:', error);
    }
  };

  useEffect(() => {
    fetchTunnel();
    fetchRecords();
  }, [id]);

  // 删除隧道
  const handleDelete = () => {
    if (!tunnel) return;

    modal.confirm({
      title: '确认删除',
      content: '删除后将无法恢复，确定要删除这个隧道吗？',
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await tunnelsService.deleteTunnel(tunnel.id);
          message.success('删除成功');
          navigate('/dashboard');
        } catch (error) {
          const apiError = error as ApiError;
          console.error('Failed to delete tunnel:', apiError);
          message.error('删除失败');
        }
      },
    });
  };

  // 上传前验证
  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
      return false;
    }
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('图片大小不能超过 10MB！');
      return false;
    }
    return false; // 阻止自动上传
  };

  // 开始分析
  const handleAnalyze = async () => {
    if (fileList.length === 0) {
      message.warning('请先选择图片');
      return;
    }
    if (!stakeMark.trim()) {
      message.warning('请输入桩号');
      return;
    }

    const file = fileList[0].originFileObj as File;
    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await defectsService.analyze({
        file,
        tunnel_id: id,
        stake_mark: stakeMark,
        direction,
        settings: defaultSettings,
      });

      setAnalysisResult(result);
      message.success('分析完成！');

      // 刷新数据
      fetchRecords();
      fetchTunnel();
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Analysis failed:', error);
      message.error(apiError.response?.data?.error?.message || '分析失败，请重试');
    } finally {
      setAnalyzing(false);
    }
  };

  // 关闭分析弹窗
  const closeAnalyzeModal = () => {
    setAnalyzeModalVisible(false);
    setFileList([]);
    setStakeMark('');
    setDirection('left');
    setAnalysisResult(null);
  };

  if (loading) {
    return (
      <div className="tunnel-detail-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (!tunnel) {
    return (
      <div className="tunnel-detail-empty">
        <Empty description="隧道不存在" />
        <Button type="primary" onClick={() => navigate('/dashboard')}>
          返回概览
        </Button>
      </div>
    );
  }

  // 方向文字映射
  const directionText: Record<string, string> = {
    left: '左侧',
    right: '右侧',
    top: '拱顶',
    bottom: '仰拱',
  };

  // 历史记录表格列
  const recordColumns = [
    {
      title: '分析时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '桩号',
      dataIndex: 'stake_mark',
      key: 'stake_mark',
      width: 100,
      render: (text: string) => text || '-',
    },
    {
      title: '方向',
      dataIndex: 'direction',
      key: 'direction',
      width: 80,
      render: (text: string) => directionText[text] || text || '-',
    },
    {
      title: '缺陷类型',
      dataIndex: 'defect_type',
      key: 'defect_type',
      render: (text: string) => text || '-',
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (text: string) =>
        text ? (
          <Tag color={getConfig(text).color}>{getConfig(text).text}</Tag>
        ) : (
          '-'
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: () => (
        <Button type="link" onClick={() => navigate('/history')}>
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <div className="tunnel-detail-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-left">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/dashboard')}
          >
            返回概览
          </Button>
          <h1 className="page-title">{tunnel.name}</h1>
        </div>
        <div className="header-actions">
          <Button
            type="primary"
            icon={<ScanOutlined />}
            onClick={() => setAnalyzeModalVisible(true)}
          >
            上传分析
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => setEditModalVisible(true)}
          >
            编辑
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
            删除
          </Button>
        </div>
      </div>

      {/* 基本信息和统计 */}
      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title="基本信息" className="info-card">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="隧道名称">{tunnel.name}</Descriptions.Item>
              <Descriptions.Item label="位置">
                <EnvironmentOutlined /> {tunnel.location || '未设置'}
              </Descriptions.Item>
              <Descriptions.Item label="长度">
                {tunnel.length_km ? `${tunnel.length_km} km` : '未设置'}
              </Descriptions.Item>
              <Descriptions.Item label="描述">
                {tunnel.description || '暂无描述'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                <ClockCircleOutlined /> {new Date(tunnel.created_at).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="缺陷统计" className="stats-card">
            <Row gutter={16}>
              <Col span={24}>
                <Statistic
                  title="总分析次数"
                  value={stats.total}
                  prefix={<AlertOutlined />}
                />
              </Col>
            </Row>

            {Object.keys(stats.bySeverity).length > 0 && (
              <>
                <Divider>严重程度分布</Divider>
                <Row gutter={[8, 8]}>
                  {Object.entries(stats.bySeverity).map(([severity, count]) => (
                    <Col key={severity}>
                      <Tag color={getConfig(severity).color}>
                        {getConfig(severity).text}: {count}
                      </Tag>
                    </Col>
                  ))}
                </Row>
              </>
            )}

            {Object.keys(stats.byType).length > 0 && (
              <>
                <Divider>缺陷类型分布</Divider>
                <div className="type-tags">
                  {Object.entries(stats.byType).map(([type, count]) => (
                    <Tag key={type} style={{ marginBottom: 4 }}>
                      {type}: {count}
                    </Tag>
                  ))}
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>

      {/* 历史记录 */}
      <Card title="分析历史" className="history-card">
        <Table
          dataSource={records.slice(0, 10)}
          columns={recordColumns}
          rowKey="id"
          pagination={false}
          size="small"
          locale={{ emptyText: '暂无分析记录' }}
        />
        {records.length > 10 && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Button onClick={() => navigate('/history')}>查看全部记录</Button>
          </div>
        )}
      </Card>

      {/* 上传分析弹窗 */}
      <Modal
        title="上传缺陷图片分析"
        open={analyzeModalVisible}
        onCancel={closeAnalyzeModal}
        footer={null}
        width={700}
        destroyOnClose
      >
        <Form layout="vertical">
          <Form.Item label="选择图片" required>
            <Upload
              fileList={fileList}
              beforeUpload={beforeUpload}
              onChange={({ fileList }) => setFileList(fileList)}
              maxCount={1}
              accept="image/*"
              listType="picture"
            >
              <Button icon={<UploadOutlined />}>选择图片</Button>
            </Upload>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="桩号" required>
                <Input
                  placeholder="例如: K45+200"
                  value={stakeMark}
                  onChange={(e) => setStakeMark(e.target.value)}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="方向" required>
                <Select
                  value={direction}
                  onChange={setDirection}
                  options={[
                    { label: '左侧', value: 'left' },
                    { label: '右侧', value: 'right' },
                    { label: '拱顶', value: 'top' },
                    { label: '仰拱', value: 'bottom' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button
              type="primary"
              icon={<ScanOutlined />}
              onClick={handleAnalyze}
              loading={analyzing}
              disabled={fileList.length === 0 || !stakeMark.trim()}
              block
            >
              开始分析
            </Button>
          </Form.Item>
        </Form>

        {/* 分析结果 */}
        {analysisResult && (
          <Card title="分析结果" className="analysis-result-card">
            <div className="result-meta">
              <span>分析时间: {analysisResult.inference_time_ms}ms</span>
              <span>模型: {analysisResult.model_used}</span>
            </div>
            {analysisResult.defect_type && (
              <p>
                <strong>缺陷类型:</strong> {analysisResult.defect_type}
              </p>
            )}
            {analysisResult.severity && (
              <p>
                <strong>严重程度:</strong>{' '}
                <Tag color={getConfig(analysisResult.severity).color}>
                  {getConfig(analysisResult.severity).text}
                </Tag>
              </p>
            )}
            <Divider>详细分析</Divider>
            <div className="result-content">{analysisResult.final_result}</div>

            {/* Repair Suggestion */}
            {analysisResult.repair_suggestion && (
              <div style={{ marginTop: 16 }}>
                <RepairSuggestionCard
                  suggestion={analysisResult.repair_suggestion}
                  ragQueryTimeMs={analysisResult.rag_query_time_ms || 0}
                />
              </div>
            )}

            {/* RAG unavailable warning */}
            {!analysisResult.repair_suggestion && analysisResult.rag_available === false && (
              <Alert
                message="修复建议服务暂不可用"
                description="仅显示缺陷检测结果，请稍后重试获取修复建议"
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </Card>
        )}
      </Modal>

      {/* Edit Tunnel Modal */}
      <CreateTunnelModal
        visible={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onSuccess={handleEditSuccess}
        editingTunnel={tunnel}
        projectId={tunnel?.project_id || ''}
      />
    </div>
  );
};

export default TunnelDetailPage;

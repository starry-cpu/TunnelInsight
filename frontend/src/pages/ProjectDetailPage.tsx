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
  App,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsService } from '../services';
import type { ProjectDetail, TunnelBrief } from '../types';
import TunnelCard from '../components/tunnels/TunnelCard';
import CreateTunnelModal from '../components/tunnels/CreateTunnelModal';
import EditProjectModal from '../components/projects/EditProjectModal';
import { useStatusConfig } from '../hooks/useStatusConfig';
import './ProjectDetailPage.css';

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getStatusInfo } = useStatusConfig();
  const { modal } = App.useApp();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tunnels, setTunnels] = useState<TunnelBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [createTunnelModalVisible, setCreateTunnelModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const fetchProject = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await projectsService.getProject(id);
      setProject(data);

      // 直接使用 API 返回的 tunnel 数据，已包含 health_index
      setTunnels(data.tunnels || []);
    } catch (error) {
      console.error('Failed to fetch project:', error);
      message.error('加载项目失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  const handleDelete = () => {
    if (!project) return;

    modal.confirm({
      title: '确认删除项目',
      content: (
        <div>
          <p>确定要删除项目「{project.name}」吗？</p>
          <p style={{ color: '#ef4444' }}>
            <AlertOutlined /> 此操作将同时删除项目下的 <strong>{project.tunnel_count || 0}</strong> 个隧道及其所有缺陷记录！
          </p>
        </div>
      ),
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const result = await projectsService.deleteProject(project.id);
          message.success(`项目已删除，共删除 ${result.deleted_tunnels} 个隧道`);
          navigate('/dashboard');
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleViewTunnel = (tunnelId: string) => {
    navigate(`/tunnels/${tunnelId}`);
  };

  const handleCreateTunnelSuccess = () => {
    setCreateTunnelModalVisible(false);
    fetchProject();
    message.success('隧道创建成功');
  };

  if (loading) {
    return (
      <div className="project-detail-page loading-container">
        <Spin size="large" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-detail-page error-container">
        <Empty description="项目不存在" />
      </div>
    );
  }

  // Use status calculated from health_index (consistent with project cards)
  const projectStatus = getStatusInfo(project.health_index);

  return (
    <div className="project-detail-page">
      {/* Header */}
      <div className="page-header">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}>
          返回
        </Button>
        <div className="header-actions">
          <Button icon={<EditOutlined />} onClick={() => setEditModalVisible(true)}>
            编辑项目
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
            删除项目
          </Button>
        </div>
      </div>

      {/* Project Info Card */}
      <Card className="project-info-card">
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Descriptions column={1}>
              <Descriptions.Item label="项目名称">{project.name}</Descriptions.Item>
              <Descriptions.Item label="描述">{project.description || '暂无描述'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={projectStatus.tagColor}>{projectStatus.label}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="隧道数量" value={project.tunnel_count || 0} />
              </Col>
              <Col span={8}>
                <Statistic
                  title="缺陷总数"
                  value={project.total_defects || 0}
                  valueStyle={{ color: '#f59e0b' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="健康指数"
                  value={project.health_index}
                  suffix="%"
                />
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Tunnels Section */}
      <Card
        className="tunnels-card"
        title="隧道列表"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateTunnelModalVisible(true)}
          >
            新建隧道
          </Button>
        }
      >
        {tunnels.length === 0 ? (
          <Empty description="暂无隧道">
            <Button type="primary" onClick={() => setCreateTunnelModalVisible(true)}>
              创建第一个隧道
            </Button>
          </Empty>
        ) : (
          <Row gutter={[16, 16]}>
            {tunnels.map((tunnel) => (
              <Col xs={24} sm={12} lg={8} key={tunnel.id}>
                <TunnelCard tunnel={tunnel} onView={handleViewTunnel} />
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* Modals */}
      <CreateTunnelModal
        visible={createTunnelModalVisible}
        projectId={project.id}
        onCancel={() => setCreateTunnelModalVisible(false)}
        onSuccess={handleCreateTunnelSuccess}
        editingTunnel={null}
      />
      <EditProjectModal
        visible={editModalVisible}
        project={project}
        onCancel={() => setEditModalVisible(false)}
        onSuccess={() => {
          setEditModalVisible(false);
          fetchProject();
        }}
      />
    </div>
  );
};

export default ProjectDetailPage;

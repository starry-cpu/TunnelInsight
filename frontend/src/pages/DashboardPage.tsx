import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Input,
  Select,
  Tag,
  Progress,
  Statistic,
  Spin,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { projectsService } from '../services';
import type { Project } from '../types';
import { CreateProjectModal } from '../components/projects';
import { useStatusConfig } from '../hooks/useStatusConfig';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { getStatusInfo } = useStatusConfig();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await projectsService.getProjects({ limit: 100 });
      setProjects(response.items);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setCreateModalVisible(false);
    fetchProjects(); // Refresh project list
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter((project) => {
    const matchSearch = project.name.toLowerCase().includes(searchText.toLowerCase());
    if (statusFilter === 'all') return matchSearch;
    const statusInfo = getStatusInfo(project.health_index);
    return matchSearch && statusInfo.key === statusFilter;
  });

  const renderProjectCard = (project: Project) => {
    const statusInfo = getStatusInfo(project.health_index);

    return (
      <Col xs={24} sm={12} lg={8} key={project.id}>
        <Card
          hoverable
          className="project-card"
          onClick={() => navigate(`/projects/${project.id}`)}
        >
          {/* Header */}
          <div className="card-header">
            <h3 className="card-title">{project.name}</h3>
            <Tag color={statusInfo.tagColor}>{statusInfo.label}</Tag>
          </div>

          {/* Description */}
          <p className="card-location">{project.description || '暂无描述'}</p>

          {/* Progress */}
          <div className="card-progress">
            <div className="progress-info">
              <span>健康指数</span>
              <span className="progress-value">{project.health_index}%</span>
            </div>
            <Progress
              percent={project.health_index}
              strokeColor={statusInfo.color}
              showInfo={false}
              size="small"
            />
          </div>

          {/* Stats */}
          <div className="card-stats">
            <div className="stat-item">
              <span className="stat-label">隧道数量</span>
              <span className="stat-value">{project.tunnel_count || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">缺陷总数</span>
              <span className="stat-value">{project.total_defects || 0}</span>
            </div>
          </div>

          {/* Footer */}
          <Button type="link" icon={<EyeOutlined />} className="card-action">
            查看详情
          </Button>
        </Card>
      </Col>
    );
  };

  const warningCount = projects.filter((p) => {
    const info = getStatusInfo(p.health_index);
    return info.key !== 'normal';
  }).length;
  const totalTunnels = projects.reduce((sum, p) => sum + (p.tunnel_count || 0), 0);

  return (
    <div className="dashboard-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">项目概览</h1>
          <p className="page-subtitle">
            目前管理中共有 {projects.length} 个项目，
            {warningCount > 0 ? (
              <>其中 <span style={{ color: '#f59e0b' }}>{warningCount}</span> 个处于预警状态。</>
            ) : (
              <>所有项目运行正常。</>
            )}
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setCreateModalVisible(true)}
        >
          新建项目
        </Button>
      </div>

      {/* Search and Filter */}
      <Card className="filter-card">
        <Row gutter={16}>
          <Col xs={24} md={14}>
            <Input
              size="large"
              placeholder="搜索项目名称..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={10}>
            <Select
              size="large"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: '所有状态', value: 'all' },
                { label: '运行正常', value: 'normal' },
                { label: '轻微警告', value: 'minor' },
                { label: '一般警告', value: 'warning' },
                { label: '严重警告', value: 'critical' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="总项目数" value={projects.length} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="隧道总数" value={totalTunnels} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="正常项目"
              value={projects.filter((p) => getStatusInfo(p.health_index).key === 'normal').length}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="预警项目"
              value={warningCount}
              valueStyle={{ color: warningCount > 0 ? '#ef4444' : '#10b981' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Project Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="empty-state">
          <Empty
            description={searchText || statusFilter !== 'all' ? '没有匹配的项目' : '暂无项目'}
          >
            {!searchText && statusFilter === 'all' && (
              <Button type="primary" onClick={() => setCreateModalVisible(true)}>
                创建第一个项目
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>{filteredProjects.map(renderProjectCard)}</Row>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default DashboardPage;

import React from 'react';
import { Select, Spin, Empty, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { projectsService } from '../../services';
import type { Project } from '../../types';
import './ProjectSelector.css';

interface ProjectSelectorProps {
  value?: string | null;
  onChange?: (value: string | null) => void;
  style?: React.CSSProperties;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({ value, onChange, style }) => {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    projectsService.getProjects({ limit: 100 })
      .then(res => setProjects(res.items))
      .catch(err => console.error('Failed to load projects:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="project-selector-loading">
        <Spin size="small" />
        <span style={{ marginLeft: 8 }}>加载项目列表...</span>
      </div>
    );
  }

  return (
    <Select
      style={style}
      placeholder="选择项目"
      value={value}
      onChange={onChange}
      loading={loading}
      allowClear
      showSearch
      optionFilterProp="children"
      notFoundContent={
        <div className="empty-project-hint">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无项目">
            <Button type="link" onClick={() => navigate('/dashboard')}>
              去创建项目
            </Button>
          </Empty>
        </div>
      }
    >
      {projects.map(p => (
        <Select.Option key={p.id} value={p.id}>
          {p.name} ({p.tunnel_count || 0} 个隧道)
        </Select.Option>
      ))}
    </Select>
  );
};

export default ProjectSelector;

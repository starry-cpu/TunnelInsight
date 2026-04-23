import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Row,
  Col,
  Select,
  DatePicker,
  App,
  Statistic,
  Input,
  Tag,
} from 'antd';
import { ReloadOutlined, SearchOutlined, LineChartOutlined } from '@ant-design/icons';
import HistoryTable from '../components/history/HistoryTable';
import HistoryDetailDrawer from '../components/history/HistoryDetailDrawer';
import EvolutionAnalysisModal from '../components/analysis/EvolutionAnalysisModal';
import { historyService, projectsService, tunnelsService, defectsService } from '../services';
import type { DefectRecord, HistoryFilters, Project, Tunnel, EvolutionAnalysisResult } from '../types';

interface ApiError {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}
import './HistoryPage.css';

const { RangePicker } = DatePicker;

const HistoryPage: React.FC = () => {
  const { modal, message } = App.useApp();
  const [data, setData] = useState<DefectRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DefectRecord | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [stats, setStats] = useState({
    total_records: 0,
    today_records: 0,
    week_records: 0,
  });

  // 级联选择状态
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectTunnels, setProjectTunnels] = useState<Tunnel[]>([]);

  // 演变分析状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [evolutionLoading, setEvolutionLoading] = useState(false);
  const [evolutionResult, setEvolutionResult] = useState<EvolutionAnalysisResult | null>(null);
  const [evolutionModalVisible, setEvolutionModalVisible] = useState(false);

  const [filters, setFilters] = useState<HistoryFilters>({
    skip: 0,
    limit: 100,
  });

  // 加载项目列表
  useEffect(() => {
    projectsService.getProjects({ limit: 100 })
      .then(res => setProjects(res.items))
      .catch(err => console.error('Failed to load projects:', err));
  }, []);

  // 当选择项目时，加载该项目的隧道
  useEffect(() => {
    if (selectedProjectId) {
      tunnelsService.getTunnels({ project_id: selectedProjectId, limit: 100 })
        .then(res => setProjectTunnels(res.items))
        .catch(err => console.error('Failed to load tunnels:', err));
    } else {
      setProjectTunnels([]);
    }
    // 清空已选隧道
    setFilters(prev => ({ ...prev, tunnel_id: undefined }));
  }, [selectedProjectId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await historyService.getHistory(filters);
      console.log('=== History API Response ===');
      console.log('Full response:', response);
      console.log('Items count:', response.items?.length);
      if (response.items && response.items.length > 0) {
        console.log('First item:', response.items[0]);
        console.log('First item stake_mark:', response.items[0].stake_mark);
        console.log('First item direction:', response.items[0].direction);
      }
      setData(response.items);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      void apiError; // Error logged and displayed via message
      console.error('Failed to fetch history:', error);
      message.error('加载历史记录失败');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = async () => {
    try {
      const statsData = await historyService.getStats();
      setStats(statsData);
    } catch (error: unknown) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchStats();
  }, [fetchData]);

  const handleView = (id: string) => {
    const record = data.find((r) => r.id === id);
    if (record) {
      setSelectedRecord(record);
      setDrawerVisible(true);
    }
  };

  const handleDelete = (id: string) => {
    modal.confirm({
      title: '确认删除',
      content: '删除后将无法恢复，确定要删除这条记录吗？',
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await historyService.deleteRecord(id);
          message.success('删除成功');
          fetchData();
          fetchStats();
        } catch (error: unknown) {
          const apiError = error as ApiError;
          void apiError; // Error logged and displayed via message
          console.error('Failed to delete record:', error);
          message.error('删除失败');
        }
      },
    });
  };

  const handleDateChange = (dates: unknown) => {
    const dateArray = dates as { startOf: (unit: string) => { toISOString: () => string }; endOf: (unit: string) => { toISOString: () => string } }[] | null;
    if (dateArray && dateArray[0] && dateArray[1]) {
      setFilters({
        ...filters,
        date_from: dateArray[0].startOf('day').toISOString(),
        date_to: dateArray[1].endOf('day').toISOString(),
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { date_from, date_to, ...rest } = filters;
      setFilters(rest);
    }
  };

  // 检查选中的记录是否可以进行演变分析
  const canAnalyzeEvolution = (): { canAnalyze: boolean; reason: string } => {
    if (selectedRowKeys.length < 2) {
      return { canAnalyze: false, reason: '请至少选择 2 条记录' };
    }

    const selectedRecords = data.filter(r => selectedRowKeys.includes(r.id));

    // 检查是否有位置信息
    const recordsWithoutLocation = selectedRecords.filter(r => !r.stake_mark || !r.direction);
    if (recordsWithoutLocation.length > 0) {
      return { canAnalyze: false, reason: '部分记录缺少桩号或方向信息' };
    }

    // 检查位置是否一致
    const firstRecord = selectedRecords[0];
    const inconsistentRecords = selectedRecords.filter(
      r => r.stake_mark !== firstRecord.stake_mark || r.direction !== firstRecord.direction
    );

    if (inconsistentRecords.length > 0) {
      return { canAnalyze: false, reason: '所选记录必须属于同一桩号和方向' };
    }

    return { canAnalyze: true, reason: `已选 ${selectedRowKeys.length} 条，同一位置` };
  };

  // 执行演变分析
  const handleEvolutionAnalysis = async () => {
    const { canAnalyze } = canAnalyzeEvolution();
    if (!canAnalyze) return;

    setEvolutionLoading(true);
    setEvolutionModalVisible(true);

    try {
      const result = await defectsService.evolutionAnalysis({
        defect_ids: selectedRowKeys as string[],
      });
      setEvolutionResult(result);
    } catch (error) {
      console.error('Evolution analysis failed:', error);
      message.error('演变分析失败，请重试');
      setEvolutionModalVisible(false);
    } finally {
      setEvolutionLoading(false);
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div className="history-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">历史记录</h1>
          <p className="page-subtitle">
            查看和管理所有的缺陷分析记录
          </p>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchData}
          loading={loading}
        >
          刷新
        </Button>
      </div>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="总记录数" value={stats.total_records} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="今日记录"
              value={stats.today_records}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="本周记录"
              value={stats.week_records}
              valueStyle={{ color: '#3b82f6' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters - 级联选择 */}
      <Card className="filter-card" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} md={4}>
            <Input
              placeholder="搜索隧道名称"
              value={filters.tunnel_name}
              onChange={(e) => setFilters({ ...filters, tunnel_name: e.target.value })}
              allowClear
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="选择项目"
              allowClear
              showSearch
              optionFilterProp="children"
              onChange={(value) => setSelectedProjectId(value || null)}
              value={selectedProjectId}
            >
              {projects.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="选择隧道"
              allowClear
              showSearch
              optionFilterProp="children"
              disabled={!selectedProjectId}
              onChange={(value) => setFilters({ ...filters, tunnel_id: value })}
              value={filters.tunnel_id}
            >
              {projectTunnels.map(t => (
                <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="缺陷类型"
              allowClear
              onChange={(value) =>
                setFilters({ ...filters, defect_type: value })
              }
            >
              <Select.Option value="裂缝">裂缝</Select.Option>
              <Select.Option value="渗水">渗水</Select.Option>
              <Select.Option value="剥落">剥落</Select.Option>
              <Select.Option value="变形">变形</Select.Option>
              <Select.Option value="腐蚀">腐蚀</Select.Option>
              <Select.Option value="未知">未知</Select.Option>
            </Select>
          </Col>
          <Col xs={24} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="严重程度"
              allowClear
              onChange={(value) =>
                setFilters({ ...filters, severity: value })
              }
            >
              <Select.Option value="low">低</Select.Option>
              <Select.Option value="medium">中</Select.Option>
              <Select.Option value="high">高</Select.Option>
              <Select.Option value="critical">严重</Select.Option>
            </Select>
          </Col>
          <Col xs={24} md={4}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={handleDateChange}
            />
          </Col>
        </Row>
      </Card>

      {/* 演变分析操作栏 - 始终显示 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <LineChartOutlined style={{ fontSize: 20, color: '#1890ff' }} />
          <span>
            演变分析：选择同一桩号和方向的 2 条及以上记录进行分析
          </span>
          {selectedRowKeys.length > 0 && (
            <>
              <Tag color="blue">已选择 {selectedRowKeys.length} 条</Tag>
              <Button
                type="primary"
                icon={<LineChartOutlined />}
                onClick={handleEvolutionAnalysis}
                disabled={!canAnalyzeEvolution().canAnalyze}
                loading={evolutionLoading}
              >
                开始分析
              </Button>
              <span style={{ color: canAnalyzeEvolution().canAnalyze ? '#52c41a' : '#999' }}>
                {canAnalyzeEvolution().reason}
              </span>
              <Button onClick={() => setSelectedRowKeys([])}>取消选择</Button>
            </>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="table-card">
        <HistoryTable
          data={data}
          loading={loading}
          rowSelection={rowSelection}
          onView={handleView}
          onDelete={handleDelete}
        />
      </Card>

      {/* Detail Drawer */}
      <HistoryDetailDrawer
        visible={drawerVisible}
        record={selectedRecord}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedRecord(null);
        }}
      />

      {/* 演变分析弹窗 */}
      <EvolutionAnalysisModal
        visible={evolutionModalVisible}
        loading={evolutionLoading}
        result={evolutionResult}
        onClose={() => {
          setEvolutionModalVisible(false);
          setEvolutionResult(null);
        }}
      />
    </div>
  );
};

export default HistoryPage;

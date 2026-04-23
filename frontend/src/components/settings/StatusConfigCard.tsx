import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Popconfirm,
  message,
  Tag,
  Tooltip,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { configService } from '../../services/config.service';
import type {
  StatusLevel,
  StatusLevelCreate,
  StatusLevelUpdate,
} from '../../types/config.types';
import './SettingsCard.css';

// Ant Design preset colors
const PRESET_COLORS = [
  { label: '绿色', value: '#52c41a' },
  { label: '蓝色', value: '#1890ff' },
  { label: '橙色', value: '#fa8c16' },
  { label: '红色', value: '#f5222d' },
  { label: '紫色', value: '#722ed1' },
  { label: '青色', value: '#13c2c2' },
  { label: '洋红', value: '#eb2f96' },
  { label: '金色', value: '#faad14' },
  { label: '黄绿', value: '#a0d911' },
  { label: '灰色', value: '#8c8c8c' },
];

const StatusConfigCard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [statusLevels, setStatusLevels] = useState<StatusLevel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<StatusLevel | null>(null);
  const [form] = Form.useForm();

  const fetchStatusLevels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await configService.getStatusLevels();
      setStatusLevels(data);
    } catch (error) {
      console.error('获取状态等级失败:', error);
      message.error('加载状态等级失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatusLevels();
  }, [fetchStatusLevels]);

  const handleCreate = () => {
    setEditingLevel(null);
    form.resetFields();
    form.setFieldsValue({
      color: '#1890ff',
      sort_order: statusLevels.length,
      max_score: null,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (record: StatusLevel) => {
    setEditingLevel(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (record: StatusLevel) => {
    if (statusLevels.length <= 1) {
      message.warning('无法删除唯一的状态等级');
      return;
    }

    setLoading(true);
    try {
      await configService.deleteStatusLevel(record.id);
      message.success('状态等级删除成功');
      fetchStatusLevels();
    } catch (error) {
      console.error('删除状态等级失败:', error);
      message.error('删除状态等级失败');
    } finally {
      setLoading(false);
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editingLevel) {
        // 更新现有等级
        const updateData: StatusLevelUpdate = {
          label: values.label,
          min_score: values.min_score,
          max_score: values.max_score,
          color: values.color,
          sort_order: values.sort_order,
        };
        await configService.updateStatusLevel(editingLevel.id, updateData);
        message.success('状态等级更新成功');
      } else {
        // 创建新等级
        const createData: StatusLevelCreate = {
          key: values.key,
          label: values.label,
          min_score: values.min_score,
          max_score: values.max_score,
          color: values.color,
          sort_order: values.sort_order,
        };
        await configService.createStatusLevel(createData);
        message.success('状态等级创建成功');
      }

      setIsModalOpen(false);
      fetchStatusLevels();
    } catch (error) {
      console.error('保存状态等级失败:', error);
      message.error('保存状态等级失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '标识键',
      dataIndex: 'key',
      key: 'key',
      width: 120,
      render: (text: string) => <code>{text}</code>,
    },
    {
      title: '显示名称',
      dataIndex: 'label',
      key: 'label',
      width: 150,
      render: (text: string, record: StatusLevel) => (
        <Tag color={record.color}>{text}</Tag>
      ),
    },
    {
      title: '分数范围',
      key: 'score_range',
      width: 180,
      render: (_: unknown, record: StatusLevel) => (
        <Tooltip title="状态由缺陷加权分数确定">
          <span>
            {record.min_score} - {record.max_score ?? '∞'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '最小分数',
      dataIndex: 'min_score',
      key: 'min_score',
      width: 100,
    },
    {
      title: '最大分数',
      dataIndex: 'max_score',
      key: 'max_score',
      width: 100,
      render: (value: number | null) => (value === null ? '∞' : value),
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      width: 100,
      render: (color: string) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              backgroundColor: color,
              borderRadius: 4,
              border: '1px solid #d9d9d9',
            }}
          />
          <span style={{ fontSize: 12, color: '#666' }}>{color}</span>
        </div>
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>
          {active ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: StatusLevel) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="确定删除此状态等级？"
            description={
              statusLevels.length <= 1
                ? '这是唯一的状态等级，无法删除。'
                : '此操作不可撤销。'
            }
            onConfirm={() => handleDelete(record)}
            okText="删除"
            cancelText="取消"
            disabled={statusLevels.length <= 1}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={statusLevels.length <= 1}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <Card
        title="状态等级配置"
        className="settings-card"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchStatusLevels}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              新建等级
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={statusLevels}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="middle"
        />

        {/* 创建/编辑弹窗 */}
        <Modal
          title={editingLevel ? '编辑状态等级' : '新建状态等级'}
          open={isModalOpen}
          onOk={handleModalOk}
          onCancel={() => setIsModalOpen(false)}
          confirmLoading={loading}
          destroyOnClose
          okText="保存"
          cancelText="取消"
        >
          <Form form={form} layout="vertical">
            <Form.Item
              name="key"
              label="标识键"
              rules={[
                { required: true, message: '请输入标识键' },
                {
                  pattern: /^[a-z_]+$/,
                  message: '标识键只能使用小写字母和下划线',
                },
              ]}
            >
              <Input
                placeholder="例如：normal、minor、warning、critical"
                disabled={!!editingLevel}
              />
            </Form.Item>

            <Form.Item
              name="label"
              label="显示名称"
              rules={[{ required: true, message: '请输入显示名称' }]}
            >
              <Input placeholder="界面显示的名称" />
            </Form.Item>

            <Form.Item
              name="min_score"
              label="最小分数"
              rules={[{ required: true, message: '请输入最小分数' }]}
              extra="达到此分数时显示该状态"
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              name="max_score"
              label="最大分数"
              extra="达到此分数时不再显示该状态（留空表示无上限）"
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="留空表示无上限"
              />
            </Form.Item>

            <Form.Item
              name="color"
              label="颜色"
              rules={[{ required: true, message: '请选择颜色' }]}
            >
              <Select placeholder="选择颜色">
                {PRESET_COLORS.map((color) => (
                  <Select.Option key={color.value} value={color.value}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          backgroundColor: color.value,
                          borderRadius: 2,
                        }}
                      />
                      {color.label}
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="sort_order"
              label="排序"
              extra="数字越小越靠前"
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </Spin>
  );
};

export default StatusConfigCard;

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
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { configService } from '../../services/config.service';
import type {
  SeverityLevel,
  SeverityLevelCreate,
  SeverityLevelUpdate,
} from '../../types/config.types';
import { useUIStore } from '../../stores/uiStore';
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

const SeverityConfigCard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [severityLevels, setSeverityLevels] = useState<SeverityLevel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<SeverityLevel | null>(null);
  const [deletingLevel, setDeletingLevel] = useState<SeverityLevel | null>(null);
  const [migrateToId, setMigrateToId] = useState<string | undefined>(undefined);
  const [form] = Form.useForm();
  const refreshSeverityLevels = useUIStore(state => state.fetchSeverityLevels);

  const fetchSeverityLevels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await configService.getSeverityLevels();
      setSeverityLevels(data);
    } catch (error) {
      console.error('获取严重程度等级失败:', error);
      message.error('加载严重程度等级失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeverityLevels();
  }, [fetchSeverityLevels]);

  const handleCreate = () => {
    setEditingLevel(null);
    form.resetFields();
    form.setFieldsValue({
      color: '#fa8c16',
      sort_order: severityLevels.length,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (record: SeverityLevel) => {
    setEditingLevel(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = (record: SeverityLevel) => {
    setDeletingLevel(record);
    setMigrateToId(undefined);
    setIsDeleteModalOpen(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editingLevel) {
        // 更新现有等级
        const updateData: SeverityLevelUpdate = {
          label: values.label,
          score_weight: values.score_weight,
          color: values.color,
          sort_order: values.sort_order,
        };
        await configService.updateSeverityLevel(editingLevel.id, updateData);

        // 新增：触发全局刷新
        await refreshSeverityLevels(true);

        message.success('严重程度等级更新成功');
      } else {
        // 创建新等级
        const createData: SeverityLevelCreate = {
          key: values.key,
          label: values.label,
          score_weight: values.score_weight,
          color: values.color,
          sort_order: values.sort_order,
        };
        await configService.createSeverityLevel(createData);

        // 新增：触发全局刷新
        await refreshSeverityLevels(true);

        message.success('严重程度等级创建成功');
      }

      setIsModalOpen(false);
      fetchSeverityLevels();
    } catch (error) {
      console.error('保存严重程度等级失败:', error);
      message.error('保存严重程度等级失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingLevel) return;

    setLoading(true);
    try {
      const result = await configService.deleteSeverityLevel(
        deletingLevel.id,
        migrateToId
      );

      // 新增：触发全局刷新
      await refreshSeverityLevels(true);

      if (result.migrated_records && result.migrated_records > 0) {
        message.success(`严重程度等级已删除，已迁移 ${result.migrated_records} 条记录`);
      } else {
        message.success('严重程度等级删除成功');
      }
      setIsDeleteModalOpen(false);
      fetchSeverityLevels();
    } catch (error) {
      console.error('删除严重程度等级失败:', error);
      message.error('删除严重程度等级失败');
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
      render: (text: string, record: SeverityLevel) => (
        <Tag color={record.color}>{text}</Tag>
      ),
    },
    {
      title: '分数权重',
      dataIndex: 'score_weight',
      key: 'score_weight',
      width: 120,
      render: (value: number) => (
        <Tooltip title="权重越高，对状态分数的影响越大">
          <span>{value}</span>
        </Tooltip>
      ),
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
      render: (_: unknown, record: SeverityLevel) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="确定删除此严重程度等级？"
            description={
              severityLevels.length <= 1
                ? '这是唯一的严重程度等级，无法删除。'
                : '此操作不可撤销，关联的记录可能需要迁移。'
            }
            onConfirm={() => handleDelete(record)}
            okText="删除"
            cancelText="取消"
            disabled={severityLevels.length <= 1}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={severityLevels.length <= 1}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 可选的迁移目标（排除正在删除的等级）
  const migrationOptions = severityLevels.filter(
    (level) => level.id !== deletingLevel?.id
  );

  return (
    <Spin spinning={loading}>
      <Card
        title="严重程度等级配置"
        className="settings-card"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchSeverityLevels}
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
          dataSource={severityLevels}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="middle"
        />

        {/* 创建/编辑弹窗 */}
        <Modal
          title={editingLevel ? '编辑严重程度等级' : '新建严重程度等级'}
          open={isModalOpen}
          onOk={handleModalOk}
          onCancel={() => setIsModalOpen(false)}
          confirmLoading={loading}
          okText="保存"
          cancelText="取消"
          destroyOnClose
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
                placeholder="例如：critical、high、medium、low"
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
              name="score_weight"
              label="分数权重"
              rules={[{ required: true, message: '请输入分数权重' }]}
              extra="权重越高，对整体状态分数的影响越大"
            >
              <InputNumber
                min={0}
                max={100}
                step={1}
                style={{ width: '100%' }}
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

        {/* 删除确认弹窗（带迁移选项） */}
        <Modal
          title={
            <Space>
              <ExclamationCircleOutlined style={{ color: '#faad14' }} />
              删除严重程度等级
            </Space>
          }
          open={isDeleteModalOpen}
          onOk={handleDeleteConfirm}
          onCancel={() => setIsDeleteModalOpen(false)}
          confirmLoading={loading}
          okText="删除"
          okButtonProps={{ danger: true }}
          cancelText="取消"
        >
          <p>
            确定要删除 <strong>{deletingLevel?.label}</strong> 吗？
          </p>
          <p>
            如果有关联的缺陷记录，可以将它们迁移到其他严重程度等级：
          </p>
          <Select
            placeholder="选择迁移目标等级（可选）"
            style={{ width: '100%' }}
            allowClear
            onChange={(value) => setMigrateToId(value)}
            value={migrateToId}
          >
            {migrationOptions.map((level) => (
              <Select.Option key={level.id} value={level.id}>
                <Tag color={level.color}>{level.label}</Tag>
              </Select.Option>
            ))}
          </Select>
          <p style={{ marginTop: 8, color: '#8c8c8c', fontSize: 12 }}>
            如果不选择迁移目标，关联记录的严重程度字段将被清空。
          </p>
        </Modal>
      </Card>
    </Spin>
  );
};

export default SeverityConfigCard;

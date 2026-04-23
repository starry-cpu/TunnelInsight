import React, { useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Input,
  Modal,
  Form,
  message,
  Typography,
} from 'antd';
import { EditOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import type { SystemConfig } from '../../types';
import type { ColumnsType } from 'antd/es/table';
import './SettingsCard.css';

const { Text } = Typography;

interface SystemConfigCardProps {
  configs?: SystemConfig[];
  onRefresh?: () => void;
}

const SystemConfigCard: React.FC<SystemConfigCardProps> = ({
  configs = mockConfigs,
  onRefresh,
}) => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [form] = Form.useForm();

  const categoryColors: Record<string, string> = {
    analysis: 'blue',
    storage: 'green',
    security: 'red',
    performance: 'orange',
  };

  const categoryLabels: Record<string, string> = {
    analysis: '分析',
    storage: '存储',
    security: '安全',
    performance: '性能',
  };

  const typeLabels: Record<string, string> = {
    string: '字符串',
    number: '数字',
    boolean: '布尔值',
    json: 'JSON',
  };

  const handleEdit = (record: SystemConfig) => {
    form.setFieldsValue({
      key: record.key,
      value: record.type === 'number' ? Number(record.value) : record.value,
      description: record.description,
    });
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      // TODO: Call API to update config
      console.log('Saving config:', values);
      message.success('配置已更新');
      setEditModalVisible(false);
      onRefresh?.();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleCancel = () => {
    setEditModalVisible(false);
    form.resetFields();
  };

  const columns: ColumnsType<SystemConfig> = [
    {
      title: '配置项',
      dataIndex: 'key',
      key: 'key',
      width: 200,
      render: (text) => <Text code>{text}</Text>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category) => (
        <Tag color={categoryColors[category]}>{categoryLabels[category]}</Tag>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => <Tag>{typeLabels[type]}</Tag>,
    },
    {
      title: '当前值',
      dataIndex: 'value',
      key: 'value',
      width: 200,
      render: (value, record) => {
        if (record.type === 'boolean') {
          return (
            <Tag color={value === 'true' ? 'success' : 'default'}>
              {value === 'true' ? '启用' : '禁用'}
            </Tag>
          );
        }
        if (record.type === 'number') {
          return <Text code>{Number(value).toLocaleString()}</Text>;
        }
        return (
          <Text code ellipsis={{ tooltip: value }}>
            {value}
          </Text>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title="系统配置"
        className="settings-card"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            loading={false}
          >
            刷新
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={configs}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条配置`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title="编辑配置"
        open={editModalVisible}
        onOk={handleSave}
        onCancel={handleCancel}
        width={600}
        okText="保存"
        cancelText="取消"
        okButtonProps={{ icon: <SaveOutlined /> }}
      >
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            label="配置项"
            name="key"
            rules={[{ required: true, message: '请输入配置项' }]}
          >
            <Input disabled />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
            rules={[{ required: true, message: '请输入描述' }]}
          >
            <Input.TextArea rows={3} disabled />
          </Form.Item>

          <Form.Item
            label="配置值"
            name="value"
            rules={[{ required: true, message: '请输入配置值' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// Mock data for development
const mockConfigs: SystemConfig[] = [
  {
    id: '1',
    key: 'max_upload_size',
    value: '10485760',
    description: '最大上传文件大小（字节）',
    category: 'storage',
    type: 'number',
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    key: 'enable_auto_analysis',
    value: 'true',
    description: '启用自动分析',
    category: 'analysis',
    type: 'boolean',
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    key: 'default_temperature',
    value: '0.7',
    description: '默认温度参数',
    category: 'analysis',
    type: 'number',
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    key: 'session_timeout',
    value: '3600',
    description: '会话超时时间（秒）',
    category: 'security',
    type: 'number',
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    key: 'cache_ttl',
    value: '300',
    description: '缓存生存时间（秒）',
    category: 'performance',
    type: 'number',
    updated_at: new Date().toISOString(),
  },
];

export default SystemConfigCard;

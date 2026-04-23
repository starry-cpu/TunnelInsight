import React from 'react';
import { Table, Tag, Button, Space, Image, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import type { DefectRecord } from '../../types';
import { getImageUrl } from '../../utils/imageUrl';
import { useSeverityConfig } from '../../hooks/useSeverityConfig';

interface HistoryTableProps {
  data: DefectRecord[];
  loading?: boolean;
  rowSelection?: {
    selectedRowKeys: React.Key[];
    onChange: (selectedRowKeys: React.Key[]) => void;
  };
  onView?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const HistoryTable: React.FC<HistoryTableProps> = ({
  data,
  loading = false,
  rowSelection,
  onView,
  onDelete,
}) => {
  const { getAllConfig } = useSeverityConfig();

  const columns: ColumnsType<DefectRecord> = [
    {
      title: '缩小图',
      dataIndex: 'image_path',
      key: 'image_path',
      width: 100,
      render: (imageUrl: string) => (
        <Image
          src={getImageUrl(imageUrl)}
          alt="defect"
          width={100}
          height={70}
          style={{
            objectFit: 'contain',
            borderRadius: 4,
          }}
          placeholder
          fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='70'%3E%3Crect fill='%23f0f0f0' width='100%25' height='100%25'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3E加载失败%3C/text%3E%3C/svg%3E"
        />
      ),
    },
    {
      title: '隧道名称',
      dataIndex: 'tunnel_name',
      key: 'tunnel_name',
      width: 150,
      render: (tunnelName: string) => (
        <span style={{ color: tunnelName ? '#1890ff' : '#999', fontWeight: tunnelName ? 500 : 400 }}>
          {tunnelName || '未设置'}
        </span>
      ),
    },
    {
      title: '桩号',
      dataIndex: 'stake_mark',
      key: 'stake_mark',
      width: 100,
      render: (stakeMark: string) => stakeMark || '-',
    },
    {
      title: '方向',
      dataIndex: 'direction',
      key: 'direction',
      width: 80,
      render: (direction: string) => {
        const map: Record<string, string> = {
          left: '左侧', right: '右侧', top: '拱顶', bottom: '仰拱'
        };
        return map[direction] || direction || '-';
      },
    },
    {
      title: '缺陷类型',
      dataIndex: 'defect_type',
      key: 'defect_type',
      width: 120,
      render: (type: string) => type || '-',
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => {
        if (!severity) return '-';
        const config = getAllConfig()[severity];
        return <Tag color={config?.color}>{config?.text || severity}</Tag>;
      },
    },
    {
      title: '分析时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => {
        // 简化时间显示，避免时区转换错误
        const formatDate = date ? new Date(date).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }) : '-';

        return formatDate;
      },
    },
    {
      title: '推理时间',
      dataIndex: 'inference_time_ms',
      key: 'inference_time_ms',
      width: 100,
      render: (time: number) => `${time}ms`,
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_value: unknown, record: DefectRecord) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onView?.(record.id)}
            />
          </Tooltip>
          {onDelete && (
            <Tooltip title="删除">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDelete?.(record.id)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      loading={loading}
      rowKey="id"
      rowSelection={rowSelection}
      pagination={{
        total: data.length,
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条`,
      }}
      scroll={{ x: 1300 }}
    />
  );
};

export default HistoryTable;

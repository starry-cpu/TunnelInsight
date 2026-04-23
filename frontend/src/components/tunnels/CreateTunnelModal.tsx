import React from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Spin,
} from 'antd';
import { tunnelsService } from '../../services';
import type { CreateTunnelRequest, Tunnel } from '../../types';
import BaiduMapPicker from '../common/BaiduMapPicker';
import type { MapLocation } from '../../types/common.types';

interface ApiError {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}

interface CreateTunnelModalProps {
  visible: boolean;
  projectId: string;  // 必须指定项目ID
  onCancel: () => void;
  onSuccess: (tunnel: Tunnel) => void;
  editingTunnel?: Tunnel | null;
}

const CreateTunnelModal: React.FC<CreateTunnelModalProps> = ({
  visible,
  projectId,
  onCancel,
  onSuccess,
  editingTunnel,
}) => {
  const [form] = Form.useForm<CreateTunnelRequest>();
  const [loading, setLoading] = React.useState(false);
  const [mapLocation, setMapLocation] = React.useState<MapLocation | null>(null);

  React.useEffect(() => {
    if (visible && editingTunnel) {
      form.setFieldsValue({
        name: editingTunnel.name,
        location: editingTunnel.location,
        description: editingTunnel.description,
        length_km: editingTunnel.length_km,
        longitude: editingTunnel.longitude,
        latitude: editingTunnel.latitude,
      });
      // 如果有经纬度，设置地图位置
      if (editingTunnel.longitude && editingTunnel.latitude) {
        setMapLocation({
          longitude: editingTunnel.longitude,
          latitude: editingTunnel.latitude,
          address: editingTunnel.location || '',
        });
      } else {
        setMapLocation(null);
      }
    } else if (visible) {
      form.resetFields();
      setMapLocation(null);
    }
  }, [visible, editingTunnel, form]);

  const handleMapLocationChange = (location: MapLocation) => {
    setMapLocation(location);
    form.setFieldsValue({
      location: location.address,
      longitude: location.longitude,
      latitude: location.latitude,
    });
  };

  const handleSubmit = async (values: CreateTunnelRequest) => {
    setLoading(true);
    try {
      // 创建时自动关联项目
      const tunnelData = {
        ...values,
        project_id: projectId,
      };

      if (editingTunnel) {
        const updated = await tunnelsService.updateTunnel(editingTunnel.id, values);
        message.success('隧道更新成功');
        onSuccess(updated);
      } else {
        const created = await tunnelsService.createTunnel(tunnelData);
        message.success('隧道创建成功');
        onSuccess(created);
      }
      form.resetFields();
      onCancel();
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('Failed to save tunnel:', error);
      message.error(apiError.response?.data?.error?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={editingTunnel ? '编辑隧道' : '创建新隧道'}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            name="name"
            label="隧道名称"
            rules={[
              { required: true, message: '请输入隧道名称' },
              { max: 200, message: '隧道名称不能超过200个字符' },
            ]}
          >
            <Input placeholder="例如：秦岭一号隧道" />
          </Form.Item>

          <Form.Item label="位置">
            <BaiduMapPicker
              value={mapLocation || undefined}
              onChange={handleMapLocationChange}
              height={300}
              placeholder="搜索地址或在地图上点击选择位置"
            />
          </Form.Item>

          <Form.Item name="location" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="longitude" hidden>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="latitude" hidden>
            <Input type="number" />
          </Form.Item>

          <Form.Item
            name="length_km"
            label="长度 (公里)"
            rules={[
              { type: 'number', min: 0, message: '长度必须大于等于0' },
            ]}
          >
            <InputNumber
              min={0}
              max={100}
              step={0.1}
              precision={2}
              style={{ width: '100%' }}
              placeholder="隧道长度"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            rules={[{ max: 1000, message: '描述不能超过1000个字符' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="输入隧道描述信息..."
              showCount
              maxLength={1000}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
                disabled={loading}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? '提交中...' : editingTunnel ? '更新' : '创建'}
              </button>
            </div>
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default CreateTunnelModal;

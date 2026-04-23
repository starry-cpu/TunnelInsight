import React from 'react';
import { Modal, Form, Input, message, Spin } from 'antd';
import { projectsService } from '../../services';
import type { CreateProjectRequest } from '../../types';

interface ApiError {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}

interface CreateProjectModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm<CreateProjectRequest>();
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      form.resetFields();
    }
  }, [visible, form]);

  const handleSubmit = async (values: CreateProjectRequest) => {
    setLoading(true);
    try {
      await projectsService.createProject(values);
      message.success('项目创建成功');
      form.resetFields();
      onSuccess();
      onCancel();
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('Failed to create project:', error);
      message.error(apiError.response?.data?.error?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="新建项目"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnClose
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
            label="项目名称"
            rules={[
              { required: true, message: '请输入项目名称' },
              { max: 200, message: '项目名称不能超过200个字符' },
            ]}
          >
            <Input placeholder="例如：深圳地铁5号线隧道检测项目" />
          </Form.Item>

          <Form.Item
            name="description"
            label="项目描述"
          >
            <Input.TextArea
              rows={4}
              placeholder="输入项目描述信息..."
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
                {loading ? '创建中...' : '创建'}
              </button>
            </div>
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default CreateProjectModal;

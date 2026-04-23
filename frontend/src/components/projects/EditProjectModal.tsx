import React from 'react';
import { Modal, Form, Input, message, Spin } from 'antd';
import { projectsService } from '../../services';
import type { Project } from '../../types';

interface ApiError {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}

interface EditProjectModalProps {
  visible: boolean;
  project: Project | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({
  visible,
  project,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (visible && project) {
      form.setFieldsValue({
        name: project.name,
        description: project.description,
      });
    }
  }, [visible, project, form]);

  const handleSubmit = async (values: { name: string; description?: string }) => {
    if (!project) return;

    setLoading(true);
    try {
      await projectsService.updateProject(project.id, values);
      message.success('项目更新成功');
      form.resetFields();
      onSuccess();
      onCancel();
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('Failed to update project:', error);
      message.error(apiError.response?.data?.error?.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="编辑项目"
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
                {loading ? '更新中...' : '更新'}
              </button>
            </div>
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default EditProjectModal;

import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Space } from 'antd';
import {
  MailOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { authService } from '../services';

interface ApiError {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}
import './ForgotPasswordPage.css';

const { Title, Text, Paragraph } = Typography;

const ForgotPasswordPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [debugToken, setDebugToken] = useState<string | null>(null);

  const handleEmailSubmit = async (values: { email: string }) => {
    setLoading(true);
    try {
      const response = await authService.forgotPassword(values.email);
      setSentEmail(values.email);
      setEmailSent(true);

      // 开发环境显示token
      if (response.debug_mode && response.token) {
        setDebugToken(response.token);
        message.success('重置链接已生成（开发模式）');
      } else {
        message.success('如果邮箱存在，重置链接已发送');
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      message.error(apiError.response?.data?.error?.message || '发送重置邮件失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setLoading(true);
    try {
      const response = await authService.forgotPassword(sentEmail);
      if (response.debug_mode && response.token) {
        setDebugToken(response.token);
        message.success('重置链接已重新生成（开发模式）');
      } else {
        message.success('重置邮件已重新发送');
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      void apiError; // Error logged via message
      message.error('重发邮件失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const renderEmailForm = () => (
    <div className="forgot-password-step">
      <div className="step-icon">
        <MailOutlined style={{ fontSize: 48, color: '#3B82F6' }} />
      </div>
      <Title level={3} className="step-title">
        忘记密码
      </Title>
      <Paragraph className="step-description">
        请输入您注册时使用的邮箱地址，我们将向您发送密码重置链接
      </Paragraph>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleEmailSubmit}
        autoComplete="off"
        size="large"
      >
        <Form.Item
          label="邮箱地址"
          name="email"
          rules={[
            { required: true, message: '请输入邮箱地址' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input
            prefix={<MailOutlined />}
            placeholder="请输入邮箱地址"
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
          >
            发送重置链接
          </Button>
        </Form.Item>
      </Form>

      <div className="back-to-login">
        <Space>
          <ArrowLeftOutlined />
          <Link to="/login">返回登录</Link>
        </Space>
      </div>
    </div>
  );

  const renderSuccessMessage = () => (
    <div className="forgot-password-step success-step">
      <div className="step-icon">
        <CheckCircleOutlined style={{ fontSize: 48, color: '#10B981' }} />
      </div>
      <Title level={3} className="step-title">
        邮件已发送
      </Title>
      <Paragraph className="step-description">
        我们已向 <Text strong>{sentEmail}</Text> 发送了密码重置链接
      </Paragraph>

      <div className="info-box">
        <InfoCircleOutlined style={{ color: '#3B82F6', marginRight: 8 }} />
        <Text>
          邮件可能需要几分钟才能到达。如果未收到，请检查垃圾邮件文件夹。
        </Text>
      </div>

      {/* 开发环境显示重置链接 */}
      {debugToken && (
        <div className="debug-info-box">
          <Paragraph>
            <Text strong>开发模式 - 重置链接：</Text>
          </Paragraph>
          <Paragraph copyable style={{ wordBreak: 'break-all' }}>
            <Text code>{window.location.origin}/reset-password/{debugToken}</Text>
          </Paragraph>
          <Paragraph type="secondary" style={{ fontSize: 12 }}>
            或直接使用token: <Text code copyable>{debugToken}</Text>
          </Paragraph>
        </div>
      )}

      <Space direction="vertical" style={{ width: '100%', marginTop: 24 }} size="middle">
        <Button
          type="primary"
          block
          onClick={handleResendEmail}
          loading={loading}
        >
          重新发送邮件
        </Button>
        <Link to="/login">
          <Button block>返回登录</Button>
        </Link>
      </Space>
    </div>
  );

  return (
    <div className="forgot-password-page">
      <Card className="forgot-password-card">
        <div className="forgot-password-header">
          <div className="forgot-password-logo">
            <svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="64" height="64" rx="8" fill="#3B82F6" />
              <path d="M16 32L28 44L48 24" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 20H48" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
              <path d="M16 26H40" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
            </svg>
          </div>
          <h2 className="forgot-password-brand">TunnelInsight</h2>
        </div>

        {!emailSent ? renderEmailForm() : renderSuccessMessage()}

        <div className="forgot-password-footer">
          <p>© 2026 TunnelInsight 智能科技有限公司 版权所有</p>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;

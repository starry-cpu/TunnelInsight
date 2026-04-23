import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Typography, Space, Progress } from 'antd';
import {
  LockOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authService } from '../services';

interface ApiError {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
    status?: number;
  };
}
import './ResetPasswordPage.css';

const { Title, Text, Paragraph } = Typography;

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    if (!token) {
      message.error('重置链接无效');
      navigate('/forgot-password');
    }
  }, [token, navigate]);

  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 15;
    if (/[a-z]/.test(password)) strength += 15;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 15;
    return Math.min(strength, 100);
  };

  const getPasswordStrengthColor = (strength: number): string => {
    if (strength < 40) return '#EF4444';
    if (strength < 70) return '#F59E0B';
    return '#10B981';
  };

  const getPasswordStrengthText = (strength: number): string => {
    if (strength < 40) return '弱';
    if (strength < 70) return '中';
    return '强';
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setPasswordStrength(calculatePasswordStrength(password));
  };

  const handleResetSubmit = async (values: { password: string }) => {
    if (!token) {
      message.error('重置链接无效');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, values.password);
      setResetSuccess(true);
      message.success('密码重置成功');
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const errorMessage = apiError.response?.data?.error?.message || '密码重置失败';
      message.error(errorMessage);

      // 如果token无效或过期，跳转到忘记密码页面
      if (apiError.response?.status === 400) {
        setTimeout(() => {
          navigate('/forgot-password');
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderResetForm = () => (
    <div className="reset-password-step">
      <div className="step-icon">
        <SafetyOutlined style={{ fontSize: 48, color: '#3B82F6' }} />
      </div>
      <Title level={3} className="step-title">
        设置新密码
      </Title>
      <Paragraph className="step-description">
        请输入您的新密码，密码长度至少8位，需包含大小写字母和数字
      </Paragraph>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleResetSubmit}
        autoComplete="off"
        size="large"
      >
        <Form.Item
          label="新密码"
          name="password"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 8, message: '密码长度至少为8个字符' },
            {
              pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
              message: '密码必须包含大小写字母和数字',
            },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请输入新密码"
            onChange={handlePasswordChange}
          />
        </Form.Item>

        {form.getFieldValue('password') && (
          <div className="password-strength">
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Text type="secondary">密码强度：</Text>
              <Text style={{ color: getPasswordStrengthColor(passwordStrength) }}>
                {getPasswordStrengthText(passwordStrength)}
              </Text>
            </Space>
            <Progress
              percent={passwordStrength}
              strokeColor={getPasswordStrengthColor(passwordStrength)}
              showInfo={false}
              size="small"
            />
          </div>
        )}

        <Form.Item
          label="确认新密码"
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请再次输入新密码"
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
          >
            重置密码
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
    <div className="reset-password-step success-step">
      <div className="step-icon">
        <CheckCircleOutlined style={{ fontSize: 48, color: '#10B981' }} />
      </div>
      <Title level={3} className="step-title">
        密码重置成功
      </Title>
      <Paragraph className="step-description">
        您的密码已成功重置，现在可以使用新密码登录
      </Paragraph>

      <Space direction="vertical" style={{ width: '100%', marginTop: 24 }} size="middle">
        <Button
          type="primary"
          size="large"
          block
          onClick={() => navigate('/login')}
        >
          前往登录
        </Button>
      </Space>
    </div>
  );

  return (
    <div className="reset-password-page">
      <Card className="reset-password-card">
        <div className="reset-password-header">
          <div className="reset-password-logo">
            <svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="64" height="64" rx="8" fill="#3B82F6" />
              <path d="M16 32L28 44L48 24" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 20H48" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
              <path d="M16 26H40" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
            </svg>
          </div>
          <h2 className="reset-password-brand">TunnelInsight</h2>
        </div>

        {!resetSuccess ? renderResetForm() : renderSuccessMessage()}

        <div className="reset-password-footer">
          <p>© 2026 TunnelInsight 智能科技有限公司 版权所有</p>
        </div>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;

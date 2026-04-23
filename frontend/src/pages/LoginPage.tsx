import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Checkbox, Button, message, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores';
import './LoginPage.css';

interface LoginFormValues {
  username: string;
  password: string;
  remember?: boolean;
}

const LoginPage: React.FC = () => {
  const [form] = Form.useForm<LoginFormValues>();
  const navigate = useNavigate();
  const { login, devLogin } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      console.log('Attempting login with:', values.username);
      await login(values.username, values.password);
      console.log('Login successful');
      message.success('登录成功');
      navigate('/');
    } catch (error: unknown) {
      console.error('Login error:', error);
      // Handle different error formats
      let errorMessage = '登录失败，请检查用户名和密码';
      if (error && typeof error === 'object') {
        const err = error as { response?: { data?: { detail?: string; error?: { message?: string } } }; message?: string };
        if (err.response?.data?.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response?.data?.error?.message) {
          errorMessage = err.response.data.error.message;
        } else if (err.message) {
          errorMessage = err.message;
        }
      }
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = () => {
    devLogin();
    message.success('开发模式登录成功');
    navigate('/');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo and Brand */}
        <div className="login-header">
          <div className="login-logo">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="64" height="64" rx="8" fill="#3B82F6" />
              <path d="M16 32L28 44L48 24" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 20H48" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
              <path d="M16 26H40" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
            </svg>
          </div>
          <h1 className="login-title">TunnelInsight</h1>
          <p className="login-subtitle">智慧隧道智能监测平台</p>
        </div>

        {/* Login Form */}
        <Form
          form={form}
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          size="large"
          className="login-form"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="管理员账号"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="安全密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <div className="login-form-options">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>记住设备</Checkbox>
              </Form.Item>
              <Link to="/forgot-password" className="login-forgot">
                忘记密码?
              </Link>
            </div>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className="login-button"
            >
              登录系统
            </Button>
          </Form.Item>

          {/* 开发模式 */}
          <Form.Item>
            <Button
              type="default"
              block
              className="dev-login-button"
              onClick={handleDevLogin}
            >
              开发模式登录（无需后端）
            </Button>
          </Form.Item>

          <Divider plain>或者</Divider>

          <div className="login-register">
            还没有账户？
            <Link to="/register">立即注册</Link>
          </div>
        </Form>

        {/* Footer */}
        <div className="login-footer">
          <p>© 2026 TunnelInsight 智能科技有限公司 版权所有</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

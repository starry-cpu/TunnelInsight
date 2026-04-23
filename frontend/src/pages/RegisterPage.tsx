import React, { useState } from 'react';
import {
  Form,
  Input,
  Button,
  Card,
  message,
  Typography,
  Space,
  Checkbox,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores';
import type { RegisterRequest } from '../types';
import './RegisterPage.css';

const { Title, Text, Paragraph } = Typography;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { register } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    text: string;
    color: string;
  }>({ score: 0, text: '', color: '' });

  const calculatePasswordStrength = (password: string) => {
    if (!password) {
      setPasswordStrength({ score: 0, text: '', color: '' });
      return;
    }

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) {
      setPasswordStrength({ score, text: '弱', color: '#ef4444' });
    } else if (score <= 4) {
      setPasswordStrength({ score, text: '中', color: '#f59e0b' });
    } else {
      setPasswordStrength({ score, text: '强', color: '#10b981' });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    calculatePasswordStrength(password);
  };

  const handleSubmit = async (values: {
    username: string;
    email: string;
    password: string;
    fullName?: string;
    agree: boolean;
  }) => {
    if (!values.agree) {
      message.warning('请阅读并同意用户协议和隐私政策');
      return;
    }

    setLoading(true);
    try {
      const payload: RegisterRequest = {
        username: values.username,
        email: values.email,
        password: values.password,
        full_name: values.fullName?.trim() || undefined,
      };

      await register(payload);

      message.success('注册成功！请登录您的账户');
      navigate('/login');
    } catch (error: unknown) {
      let errorMessage = '注册失败，请重试';
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

  return (
    <div className="register-page">
      <Card className="register-card">
        <div className="register-header">
          <Title level={2} className="register-title">
            创建账户
          </Title>
          <Paragraph className="register-subtitle">
            注册 TunnelInsight 账户，开始使用隧道缺陷分析系统
          </Paragraph>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名长度至少为3个字符' },
              { max: 20, message: '用户名长度最多为20个字符' },
              {
                pattern: /^[a-zA-Z0-9_]+$/,
                message: '用户名只能包含字母、数字和下划线',
              },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入用户名"
              size="large"
            />
          </Form.Item>

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
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="真实姓名"
            name="fullName"
            tooltip="可选，用于显示和称呼"
          >
            <Input
              placeholder="请输入真实姓名（可选）"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 8, message: '密码长度至少为8个字符' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: '密码必须包含大小写字母和数字',
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              size="large"
              onChange={handlePasswordChange}
            />
          </Form.Item>

          {passwordStrength.score > 0 && (
            <div className="password-strength">
              <div className="strength-bar">
                <div
                  className="strength-fill"
                  style={{
                    width: `${(passwordStrength.score / 6) * 100}%`,
                    backgroundColor: passwordStrength.color,
                  }}
                />
              </div>
              <Text style={{ color: passwordStrength.color, fontSize: 12 }}>
                密码强度: {passwordStrength.text}
              </Text>
            </div>
          )}

          <Form.Item
            label="确认密码"
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
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
              placeholder="请再次输入密码"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="agree"
            valuePropName="checked"
            rules={[
              {
                validator: (_, value) =>
                  value
                    ? Promise.resolve()
                    : Promise.reject(new Error('请同意用户协议')),
              },
            ]}
          >
            <Checkbox>
              我已阅读并同意
              <Link to="/terms" target="_blank">
                用户协议
              </Link>
              和
              <Link to="/privacy" target="_blank">
                隐私政策
              </Link>
            </Checkbox>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              注册账户
            </Button>
          </Form.Item>
        </Form>

        <div className="register-footer">
          <Space direction="vertical" size="small" style={{ width: '100%', textAlign: 'center' }}>
            <div>
              已有账户？
              <Link to="/login">立即登录</Link>
            </div>
            <div className="back-link">
              <Space>
                <ArrowLeftOutlined />
                <Link to="/login">返回登录</Link>
              </Space>
            </div>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default RegisterPage;

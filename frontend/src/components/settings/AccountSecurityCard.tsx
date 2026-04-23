import React from 'react';
import { Card, Descriptions, Button, Space, Typography, Divider, Avatar } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  EditOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores';
import dayjs from 'dayjs';
import './SettingsCard.css';

const { Text, Title } = Typography;

interface AccountSecurityCardProps {
  onEditProfile?: () => void;
  onChangePassword?: () => void;
}

const AccountSecurityCard: React.FC<AccountSecurityCardProps> = ({
  onEditProfile,
  onChangePassword,
}) => {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {/* Profile Card */}
      <Card
        title="个人信息"
        className="settings-card"
        extra={
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={onEditProfile}
          >
            编辑资料
          </Button>
        }
      >
        <div className="account-profile">
          <div className="profile-avatar">
            <Avatar size={80} icon={<UserOutlined />} src={user.avatar_url} />
            <Title level={4} style={{ marginTop: 16, marginBottom: 4 }}>
              {user.full_name || user.username}
            </Title>
              <Text type="secondary">@{user.username}</Text>
          </div>

          <Divider />

          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="用户ID" span={2}>
              <Text code>{user.id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="邮箱地址" span={2}>
              <Space>
                <MailOutlined />
                {user.email}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="账户状态">
              {user.is_active ? (
                <Text type="success">正常</Text>
              ) : (
                <Text type="danger">已禁用</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="验证状态">
              {user.is_verified ? (
                <Text type="success">已验证</Text>
              ) : (
                <Text type="warning">未验证</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="注册时间" span={2}>
              {dayjs(user.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="最后更新" span={2}>
              {dayjs(user.updated_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        </div>
      </Card>

      {/* Security Card */}
      <Card
        title="安全设置"
        className="settings-card"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div className="security-item">
            <div className="security-info">
              <Title level={5}>登录密码</Title>
              <Text type="secondary">
                定期更换密码可以保护账户安全
              </Text>
            </div>
            <Button
              type="default"
              icon={<LockOutlined />}
              onClick={onChangePassword}
            >
              修改密码
            </Button>
          </div>

          <Divider />

          <div className="security-item">
            <div className="security-info">
              <Title level={5}>两步验证</Title>
              <Text type="secondary">
                启用两步验证可以提高账户安全性
              </Text>
            </div>
            <Button type="default" disabled>
              即将推出
            </Button>
          </div>

          <Divider />

          <div className="security-item">
            <div className="security-info">
              <Title level={5}>登录日志</Title>
              <Text type="secondary">
                查看最近的登录活动和设备信息
              </Text>
            </div>
            <Button type="default" disabled>
              即将推出
            </Button>
          </div>
        </Space>
      </Card>
    </Space>
  );
};

export default AccountSecurityCard;

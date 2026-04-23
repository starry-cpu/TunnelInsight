import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Dropdown, Avatar, Badge } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ScanOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useAuthStore, useUIStore } from '../../stores';
import dayjs from 'dayjs';
import './DashboardLayout.css';

const { Header, Sider, Content } = Layout;

const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [currentTime, setCurrentTime] = useState(dayjs().format('YYYY年MM月DD日 HH:mm'));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs().format('YYYY年MM月DD日 HH:mm'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const menuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '项目概览',
      onClick: () => navigate('/dashboard'),
    },
    {
      key: '/analysis',
      icon: <ScanOutlined />,
      label: '缺陷分析',
      onClick: () => navigate('/analysis'),
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: '历史记录',
      onClick: () => navigate('/history'),
    },
    {
      type: 'divider',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      onClick: () => navigate('/settings'),
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => navigate('/settings?tab=account'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '注销退出',
      onClick: handleLogout,
    },
  ];

  const selectedKeys = [location.pathname];

  return (
    <Layout className="dashboard-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={sidebarCollapsed}
        className="dashboard-sider"
        width={260}
        collapsedWidth={64}
      >
        <div className="dashboard-logo">
          {!sidebarCollapsed && (
            <>
              <div className="logo-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="6" fill="#3B82F6" />
                  <path
                    d="M8 16L14 22L24 12"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="logo-text">TunnelInsight</span>
            </>
          )}
          {sidebarCollapsed && (
            <div className="logo-icon-collapsed">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="6" fill="#3B82F6" />
                <path
                  d="M8 16L14 22L24 12"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          className="dashboard-menu"
        />

        <div className="dashboard-version">
          {!sidebarCollapsed && '系统当前版本 v4.2.0-stable'}
        </div>
      </Sider>

      <Layout>
        <Header className="dashboard-header">
          <div className="header-left">
            {React.createElement(
              sidebarCollapsed ? MenuUnfoldOutlined : MenuFoldOutlined,
              {
                className: 'trigger',
                onClick: toggleSidebar,
              }
            )}
            <span className="app-name">TunnelInsight</span>
          </div>

          <div className="header-center">
            <span className="current-time">当前时间：{currentTime}</span>
          </div>

          <div className="header-right">
            <Badge count={5} size="small">
              <BellOutlined className="header-icon" />
            </Badge>
            <span className="user-name">{user?.full_name || user?.username}</span>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar
                src={user?.avatar_url}
                icon={!user?.avatar_url && <UserOutlined />}
                className="user-avatar"
              />
            </Dropdown>
          </div>
        </Header>

        <Content className="dashboard-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;

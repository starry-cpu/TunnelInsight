-- 创建测试用户 SQL
-- 密码: Admin123!

INSERT INTO users (id, username, email, password_hash, full_name, is_active, is_verified, locale, created_at, updated_at)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'admin',
  'admin@tunnelinsight.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.aOy6.Xqt8F.q8u',
  '系统管理员',
  true,
  true,
  'zh-CN',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 验证插入
SELECT id, username, email, is_active FROM users WHERE username = 'admin';

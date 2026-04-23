# TunnelInsight Frontend

隧道缺陷分析系统前端项目

## 技术栈

- React 19.2.0
- TypeScript 5.9.3
- Vite 7.3.1
- Ant Design 5.22.5
- React Router 6.28.0
- Zustand 5.0.2
- Axios 1.7.9

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器 (http://localhost:3000)
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## BMad 架构

```
frontend/
├── src/
│   ├── types/          # [M] Model - 类型定义
│   ├── stores/         # [B] Business - 状态管理
│   ├── services/       # [B] Business - API 服务
│   ├── components/     # [D] Detail - UI 组件
│   ├── pages/          # [A] Action - 页面组件
│   ├── hooks/          # 自定义 Hooks
│   └── utils/          # 工具函数
```

## 环境变量

```bash
VITE_API_BASE_URL=http://localhost:8000/api
```

## 功能页面

- `/login` - 登录页面
- `/dashboard` - 项目概览仪表板
- `/timeline` - 时间趋势检测 (待开发)
- `/analysis` - 缺陷分析 (待开发)

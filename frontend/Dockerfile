# ===================================
# TunnelInsight 前端 Docker 镜像
# React + Vite + Nginx
# ===================================

# 阶段 1: 构建
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建参数（环境变量注入）
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# 构建生产版本
RUN npm run build

# 阶段 2: 生产环境
FROM nginx:alpine

# 复制自定义 Nginx 配置
COPY nginx/frontend.conf /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]

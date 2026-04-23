#!/bin/bash
# TunnelInsight 服务停止脚本

echo "=========================================="
echo "   TunnelInsight 服务停止脚本"
echo "=========================================="
echo ""

# 停止前端
echo "停止前端服务..."
pkill -f "vite" 2>/dev/null || true
sleep 1

# 停止后端
echo "停止后端服务..."
pkill -f "uvicorn app.main:app" 2>/dev/null || true
sleep 1

# 停止 LightRAG
echo "停止 LightRAG 服务..."
pkill -f "lightrag_server.py" 2>/dev/null || true
sleep 1

# 停止 Ollama
echo "停止 Ollama 服务..."
pkill -f "ollama serve" 2>/dev/null || true
sleep 1

# 停止 MySQL
echo "停止 MySQL 服务..."
service mysql stop 2>/dev/null || true

echo ""
echo "所有服务已停止"
echo ""
echo "运行 'bash /opt/TunnelInsight/start_services.sh' 重新启动"

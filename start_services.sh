#!/bin/bash
# TunnelInsight 服务启动脚本
# 使用方法: bash /opt/TunnelInsight/start_services.sh

echo "=========================================="
echo "   TunnelInsight 服务启动脚本"
echo "=========================================="
echo ""

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 配置
export OLLAMA_MODELS=/root/autodl-tmp/ollama_models
PROJECT_DIR=/opt/TunnelInsight
LIGHTRAG_DIR=$PROJECT_DIR/backend/models/10_LightRAG-1.3.3/10_LightRAG-1.3.3/lightrag/api

# 1. MySQL
echo -e "${YELLOW}[1/5] MySQL 数据库...${NC}"
if ! pgrep -x mysqld > /dev/null; then
    service mysql start 2>/dev/null || /etc/init.d/mysql start 2>/dev/null
    sleep 2
fi
pgrep -x mysqld > /dev/null && echo -e "${GREEN}✓ MySQL 运行中${NC}" || echo -e "${RED}✗ MySQL 未运行${NC}"

# 2. Ollama
echo -e "${YELLOW}[2/5] Ollama 服务...${NC}"
mkdir -p $OLLAMA_MODELS
if ! curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
    OLLAMA_MODELS=$OLLAMA_MODELS nohup ollama serve > /tmp/ollama.log 2>&1 &
    sleep 3
fi
curl -s http://localhost:11434/api/version > /dev/null 2>&1 && echo -e "${GREEN}✓ Ollama 运行中${NC}" || echo -e "${RED}✗ Ollama 未运行${NC}"

# 检查模型
echo -e "${YELLOW}检查必要模型...${NC}"
if ! OLLAMA_MODELS=$OLLAMA_MODELS ollama list 2>/dev/null | grep -q "qwen2.5"; then
    echo "  正在拉取 qwen2.5:7b..."
    OLLAMA_MODELS=$OLLAMA_MODELS ollama pull qwen2.5:7b
fi
if ! OLLAMA_MODELS=$OLLAMA_MODELS ollama list 2>/dev/null | grep -q "nomic-embed-text"; then
    echo "  正在拉取 nomic-embed-text..."
    OLLAMA_MODELS=$OLLAMA_MODELS ollama pull nomic-embed-text
fi
echo -e "${GREEN}✓ 模型已就绪${NC}"

# 3. LightRAG
echo -e "${YELLOW}[3/5] LightRAG 服务...${NC}"
if ! curl -s http://localhost:9621/health > /dev/null 2>&1; then
    cd $LIGHTRAG_DIR
    mkdir -p knowledge_base
    OLLAMA_MODELS=$OLLAMA_MODELS nohup $PROJECT_DIR/backend/models/10_LightRAG-1.3.3/10_LightRAG-1.3.3/venv/bin/lightrag-server > /tmp/lightrag.log 2>&1 &
    sleep 5
fi
curl -s http://localhost:9621/health > /dev/null 2>&1 && echo -e "${GREEN}✓ LightRAG 运行中 (端口 9621)${NC}" || echo -e "${YELLOW}! LightRAG 启动中...${NC}"

# 4. 后端
echo -e "${YELLOW}[4/5] 后端 API 服务...${NC}"
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    cd $PROJECT_DIR/backend
    source venv/bin/activate
    nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
    sleep 3
fi
curl -s http://localhost:8000/health > /dev/null 2>&1 && echo -e "${GREEN}✓ 后端运行中 (端口 8000)${NC}" || echo -e "${YELLOW}! 后端启动中...${NC}"

# 5. 前端
echo -e "${YELLOW}[5/5] 前端服务...${NC}"
if ! curl -s http://localhost:6006 > /dev/null 2>&1; then
    cd $PROJECT_DIR/frontend
    nohup npm run dev > /tmp/frontend.log 2>&1 &
    sleep 3
fi
curl -s http://localhost:6006 > /dev/null 2>&1 && echo -e "${GREEN}✓ 前端运行中 (端口 6006)${NC}" || echo -e "${YELLOW}! 前端启动中...${NC}"

echo ""
echo "=========================================="
echo "   服务地址"
echo "=========================================="
echo ""
echo "前端界面:  http://localhost:6006"
echo "后端 API:  http://localhost:8000"
echo "API 文档:  http://localhost:8000/docs"
echo "LightRAG:  http://localhost:9621"
echo "Ollama:    http://localhost:11434"
echo ""
echo "日志文件: /tmp/ollama.log, /tmp/lightrag.log, /tmp/backend.log, /tmp/frontend.log"
echo ""

#!/bin/bash
# TunnelInsight 服务状态检查脚本

echo "=========================================="
echo "   TunnelInsight 服务状态检查"
echo "=========================================="
echo ""

# 检查函数
check_service() {
    local name=$1
    local check_cmd=$2
    local running_msg=$3
    local stopped_msg=$4

    printf "%-20s " "$name:"
    if eval "$check_cmd" > /dev/null 2>&1; then
        echo -e "\033[0;32m✓ $running_msg\033[0m"
        return 0
    else
        echo -e "\033[0;31m✗ $stopped_msg\033[0m"
        return 1
    fi
}

# 检查 MySQL
check_service "MySQL 数据库" "pgrep -x mysqld" "运行中" "未运行"

# 检查 Ollama
check_service "Ollama LLM" "curl -s http://localhost:11434/api/version" "运行中" "未运行"

# 检查模型
printf "%-20s " "Qwen2.5 模型:"
if ollama list 2>/dev/null | grep -q "qwen2.5"; then
    echo -e "\033[0;32m✓ 已安装\033[0m"
else
    echo -e "\033[0;31m✗ 未安装 (运行: ollama pull qwen2.5:7b)\033[0m"
fi

printf "%-20s " "Embedding 模型:"
if ollama list 2>/dev/null | grep -q "nomic-embed-text"; then
    echo -e "\033[0;32m✓ 已安装\033[0m"
else
    echo -e "\033[0;31m✗ 未安装 (运行: ollama pull nomic-embed-text)\033[0m"
fi

# 检查 LightRAG
check_service "LightRAG 服务" "curl -s http://localhost:9621/health" "运行中 (端口 9621)" "未运行"

# 检查后端
check_service "后端 API" "curl -s http://localhost:8000/health" "运行中 (端口 8000)" "未运行"

# 检查前端
check_service "前端服务" "curl -s http://localhost:6006" "运行中 (端口 6006)" "未运行"

echo ""
echo "=========================================="
echo "   端口占用检查"
echo "=========================================="

for port in 3306 11434 9621 8000 6006; do
    printf "端口 %-6s " "$port:"
    if lsof -i :$port > /dev/null 2>&1; then
        pid=$(lsof -t -i :$port 2>/dev/null | head -1)
        cmd=$(ps -p $pid -o comm= 2>/dev/null | head -1)
        echo -e "\033[0;32m已占用 ($cmd, PID: $pid)\033[0m"
    else
        echo -e "\033[0;33m空闲\033[0m"
    fi
done

echo ""
echo "=========================================="
echo "   GPU 状态"
echo "=========================================="
nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu --format=csv,noheader,nounits 2>/dev/null || echo "GPU 信息不可用"

echo ""
echo "=========================================="
echo "   磁盘空间"
echo "=========================================="
df -h /root/autodl-tmp/ 2>/dev/null | tail -1
echo ""
du -sh /root/autodl-tmp/ollama_models/ 2>/dev/null && echo "  (Ollama 模型)"

echo ""
echo "运行 'bash /opt/TunnelInsight/start_services.sh' 启动所有服务"
echo "运行 'bash /opt/TunnelInsight/stop_services.sh' 停止所有服务"

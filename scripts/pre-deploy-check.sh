#!/bin/bash

# ===================================
# TunnelInsight 部署前检查脚本
# 确保所有必要文件和配置就绪
# ===================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查计数
PASS=0
FAIL=0
WARN=0

# 检查函数
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        PASS=$((PASS + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $1 (缺失)"
        FAIL=$((FAIL + 1))
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
        PASS=$((PASS + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $1/ (缺失)"
        FAIL=$((FAIL + 1))
        return 1
    fi
}

check_env_var() {
    local var_name=$1
    local var_value=$(grep "^${var_name}=" .env.production 2>/dev/null | cut -d'=' -f2-)

    if [ -z "$var_value" ]; then
        echo -e "${RED}✗${NC} 环境变量 $var_name 未设置"
        FAIL=$((FAIL + 1))
        return 1
    fi

    # 检查是否使用了默认值
    if [[ "$var_value" == *"your_password"* ]] || \
       [[ "$var_value" == *"your-secret-key"* ]] || \
       [[ "$var_value" == *"generate-a-random"* ]]; then
        echo -e "${YELLOW}⚠${NC} 环境变量 $var_name 使用了默认值（请修改）"
        WARN=$((WARN + 1))
        return 1
    fi

    # 检查是否包含占位符
    if [[ "$var_value" == *"<公网IP>"* ]]; then
        echo -e "${YELLOW}⚠${NC} 环境变量 $var_name 包含占位符 <公网IP>（请替换）"
        WARN=$((WARN + 1))
        return 1
    fi

    echo -e "${GREEN}✓${NC} 环境变量 $var_name 已设置"
    PASS=$((PASS + 1))
    return 0
}

# 主检查流程
main() {
    echo -e "${BLUE}=====================================${NC}"
    echo -e "${BLUE}TunnelInsight 部署前检查${NC}"
    echo -e "${BLUE}=====================================${NC}"
    echo ""

    # 1. 检查必要文件
    echo -e "${BLUE}[1/5] 检查必要文件...${NC}"
    check_file "docker-compose.prod.yml"
    check_file ".env.production"
    check_file "backend/Dockerfile"
    check_file "frontend/Dockerfile"
    check_file "nginx/nginx.conf"
    check_file "scripts/deploy.sh"
    check_file "README-DEPLOY.md"
    echo ""

    # 2. 检查模型文件
    echo -e "${BLUE}[2/5] 检查 LoRA 模型文件...${NC}"
    if [ -d "backend/models/qwen2.5-vl-defect" ]; then
        echo -e "${GREEN}✓${NC} backend/models/qwen2.5-vl-defect/"
        PASS=$((PASS + 1))

        # 检查关键模型文件
        check_file "backend/models/qwen2.5-vl-defect/adapter_config.json"
        check_file "backend/models/qwen2.5-vl-defect/adapter_model.safetensors"
    else
        echo -e "${RED}✗${NC} backend/models/qwen2.5-vl-defect/ (缺失)"
        echo -e "${YELLOW}   请上传 LoRA 模型文件${NC}"
        FAIL=$((FAIL + 1))
    fi
    echo ""

    # 3. 检查环境变量配置
    echo -e "${BLUE}[3/5] 检查环境变量配置...${NC}"
    if [ -f ".env.production" ]; then
        check_env_var "DATABASE_URL"
        check_env_var "DB_PASSWORD"
        check_env_var "SECRET_KEY"
        check_env_var "BACKEND_CORS_ORIGINS"
        check_env_var "VITE_API_BASE_URL"
        check_env_var "MODEL_PATH"
    else
        echo -e "${RED}✗${NC} .env.production 文件不存在"
        FAIL=$((FAIL + 1))
    fi
    echo ""

    # 4. 检查系统依赖
    echo -e "${BLUE}[4/5] 检查系统依赖...${NC}"
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✓${NC} Docker 已安装"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}✗${NC} Docker 未安装"
        FAIL=$((FAIL + 1))
    fi

    if command -v docker-compose &> /dev/null; then
        echo -e "${GREEN}✓${NC} Docker Compose 已安装"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}✗${NC} Docker Compose 未安装"
        FAIL=$((FAIL + 1))
    fi

    if command -v nvidia-smi &> /dev/null; then
        echo -e "${GREEN}✓${NC} NVIDIA Driver 已安装"
        PASS=$((PASS + 1))

        # 检查 GPU 显存
        GPU_MEM=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits -i 0 | head -n1 | tr -d ' ')
        if [ ! -z "$GPU_MEM" ] && [ "$GPU_MEM" -gt 15000 ]; then
            echo -e "${GREEN}✓${NC} GPU 显存: ${GPU_MEM}MB (满足要求)"
            PASS=$((PASS + 1))
        else
            echo -e "${YELLOW}⚠${NC} GPU 显存: ${GPU_MEM}MB (建议 >16GB)"
            WARN=$((WARN + 1))
        fi
    else
        echo -e "${RED}✗${NC} NVIDIA Driver 未安装"
        FAIL=$((FAIL + 1))
    fi
    echo ""

    # 5. 检查必要目录
    echo -e "${BLUE}[5/5] 检查必要目录...${NC}"
    check_dir "backend"
    check_dir "frontend"
    check_dir "nginx"
    check_dir "scripts"

    # 创建可选目录（如果不存在）
    mkdir -p nginx/ssl
    mkdir -p backend/logs
    mkdir -p backend/uploads
    echo -e "${GREEN}✓${NC} 可选目录已创建"
    echo ""

    # 总结
    echo -e "${BLUE}=====================================${NC}"
    echo -e "${BLUE}检查结果总结${NC}"
    echo -e "${BLUE}=====================================${NC}"
    echo -e "${GREEN}通过: $PASS${NC}"
    echo -e "${RED}失败: $FAIL${NC}"
    echo -e "${YELLOW}警告: $WARN${NC}"
    echo ""

    if [ $FAIL -eq 0 ]; then
        if [ $WARN -eq 0 ]; then
            echo -e "${GREEN}✓ 所有检查通过，可以开始部署！${NC}"
            echo ""
            echo -e "${BLUE}下一步:${NC}"
            echo "  1. 修改 .env.production 中的敏感信息"
            echo "  2. 运行部署脚本: ./scripts/deploy.sh"
            exit 0
        else
            echo -e "${YELLOW}⚠ 基本检查通过，但存在 $WARN 个警告${NC}"
            echo -e "${YELLOW}  建议修复警告后再部署${NC}"
            exit 0
        fi
    else
        echo -e "${RED}✗ 存在 $FAIL 个失败项，请先修复${NC}"
        echo ""
        echo -e "${BLUE}常见问题:${NC}"
        echo "  - 模型文件缺失: 上传 LoRA 模型到 backend/models/qwen2.5-vl-defect/"
        echo "  - 环境变量未配置: 复制 .env.example 并修改配置"
        echo "  - Docker 未安装: 运行 curl -fsSL https://get.docker.com | bash"
        exit 1
    fi
}

# 执行主函数
main

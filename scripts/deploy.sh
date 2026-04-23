#!/bin/bash

# ===================================
# TunnelInsight 一键部署脚本
# AutoDL 云平台专用
# ===================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 未安装，请先安装 $1"
        exit 1
    fi
}

# 主函数
main() {
    log_info "====================================="
    log_info "TunnelInsight 自动化部署脚本"
    log_info "====================================="
    echo ""

    # 1. 检查必要命令
    log_info "步骤 1/8: 检查系统依赖..."
    check_command docker
    check_command docker-compose
    check_command nvidia-smi
    log_success "系统依赖检查通过"
    echo ""

    # 2. 检查环境变量文件
    log_info "步骤 2/8: 检查环境变量配置..."
    if [ ! -f ".env.production" ]; then
        log_error ".env.production 文件不存在"
        log_info "请先复制 .env.example 并配置环境变量"
        exit 1
    fi
    log_success "环境变量文件存在"
    echo ""

    # 3. 检查模型文件
    log_info "步骤 3/8: 检查 LoRA 模型文件..."
    MODEL_PATH="./backend/models/qwen2.5-vl-defect"
    if [ ! -d "$MODEL_PATH" ]; then
        log_warning "模型文件不存在: $MODEL_PATH"
        log_info "请上传 LoRA 模型到以下路径: $MODEL_PATH"
        read -p "按回车键继续（模型已上传）..."
    else
        log_success "模型文件存在"
    fi
    echo ""

    # 4. 创建必要的目录
    log_info "步骤 4/8: 创建必要的目录..."
    mkdir -p nginx/ssl
    mkdir -p backend/logs
    mkdir -p backend/uploads
    log_success "目录创建完成"
    echo ""

    # 5. 停止旧容器
    log_info "步骤 5/8: 停止旧容器..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production down || true
    log_success "旧容器已停止"
    echo ""

    # 6. 构建镜像
    log_info "步骤 6/8: 构建 Docker 镜像..."
    log_warning "首次构建可能需要 10-20 分钟，请耐心等待..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production build
    log_success "镜像构建完成"
    echo ""

    # 7. 启动服务
    log_info "步骤 7/8: 启动服务..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
    log_success "服务启动成功"
    echo ""

    # 8. 等待服务就绪
    log_info "步骤 8/8: 等待服务就绪..."
    log_info "后端服务需要加载 AI 模型，首次启动约需 5-10 分钟..."

    # 等待后端健康检查
    MAX_WAIT=600  # 最大等待时间 10 分钟
    WAITED=0
    while [ $WAITED -lt $MAX_WAIT ]; do
        if curl -f http://localhost:8000/health &> /dev/null; then
            log_success "后端服务就绪"
            break
        fi
        sleep 5
        WAITED=$((WAITED + 5))
        echo -n "."
    done
    echo ""

    if [ $WAITED -ge $MAX_WAIT ]; then
        log_warning "后端服务启动超时，请检查日志"
    fi

    # 显示容器状态
    log_info "容器状态:"
    docker-compose -f docker-compose.prod.yml ps
    echo ""

    # 获取公网 IP
    log_info "====================================="
    log_success "部署完成！"
    log_info "====================================="
    echo ""
    log_info "访问地址:"
    log_info "  前端: http://<公网IP>"
    log_info "  后端: http://<公网IP>/api/v1"
    log_info "  健康检查: http://<公网IP>/api/v1/health"
    echo ""
    log_info "常用命令:"
    log_info "  查看日志: docker-compose -f docker-compose.prod.yml logs -f"
    log_info "  停止服务: docker-compose -f docker-compose.prod.yml down"
    log_info "  重启服务: docker-compose -f docker-compose.prod.yml restart"
    echo ""
    log_warning "注意事项:"
    log_warning "  1. 请确保在 AutoDL 控制台开放 80 端口"
    log_warning "  2. 请修改 .env.production 中的公网 IP"
    log_warning "  3. 请修改数据库密码和 SECRET_KEY"
    echo ""
}

# 执行主函数
main

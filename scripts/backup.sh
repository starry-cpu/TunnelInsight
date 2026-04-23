#!/bin/bash

# ===================================
# TunnelInsight 快速备份脚本
# 备份重要数据
# ===================================

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# 备份目录
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="tunnelinsight_backup_${TIMESTAMP}"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

main() {
    log_info "开始备份 TunnelInsight 数据..."

    # 创建备份目录
    mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}"

    # 1. 备份数据库
    log_info "备份数据库..."
    docker exec tunnelinsight-postgres pg_dump -U tunnel_defect tunnel_defect_db > \
        "${BACKUP_DIR}/${BACKUP_NAME}/database.sql"
    log_success "数据库备份完成"

    # 2. 备份上传文件
    log_info "备份上传文件..."
    if [ -d "./backend/uploads" ]; then
        cp -r ./backend/uploads "${BACKUP_DIR}/${BACKUP_NAME}/uploads"
        log_success "上传文件备份完成"
    else
        log_info "没有上传文件需要备份"
    fi

    # 3. 备份环境配置
    log_info "备份环境配置..."
    cp .env.production "${BACKUP_DIR}/${BACKUP_NAME}/.env.production.backup"
    log_success "环境配置备份完成"

    # 4. 创建压缩包
    log_info "创建压缩包..."
    tar -czf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" -C "${BACKUP_DIR}" "${BACKUP_NAME}"
    rm -rf "${BACKUP_DIR}/${BACKUP_NAME}"
    log_success "压缩包创建完成"

    # 5. 清理旧备份（保留最近 7 个）
    log_info "清理旧备份..."
    cd "${BACKUP_DIR}"
    ls -t | tail -n +8 | xargs -r rm -f
    cd - > /dev/null
    log_success "旧备份清理完成"

    echo ""
    log_success "==================================="
    log_success "备份完成！"
    log_success "==================================="
    log_info "备份文件: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    log_info "大小: $(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)"
}

main

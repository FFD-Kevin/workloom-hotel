#!/usr/bin/env bash
cd "$(dirname "$0")/.."
docker compose stop
echo "容器已停止；前后端进程请在运行 dev 的终端按 Ctrl+C 结束。"

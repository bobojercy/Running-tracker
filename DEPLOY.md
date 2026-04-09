# 📦 打包部署指南

本文档介绍如何将项目打包成独立可执行文件，方便在没有 Node.js 环境的服务器上部署。

## 方式一：pkg 打包（推荐）

### 什么是 pkg？

[pkg](https://github.com/vercel/pkg) 可以将 Node.js 项目打包成独立的可执行文件，无需安装 Node.js 即可运行。

### 打包步骤

#### 1. 安装 pkg

```bash
npm install -g pkg
```

#### 2. 执行打包

```bash
# 在项目根目录执行
npm run build
```

或者手动打包：

```bash
# Windows x64
pkg . --targets node18-win-x64 --out-path dist

# Linux x64
pkg . --targets node18-linux-x64 --out-path dist

# macOS x64
pkg . --targets node18-macos-x64 --out-path dist
```

#### 3. 打包产物

打包完成后，`dist/` 目录会生成可执行文件：

```
dist/
└── running-tracker.exe  (Windows)
```

#### 4. 部署

将以下文件复制到目标服务器：

```
dist/running-tracker.exe    # 可执行文件
data/                        # 数据目录（可保留已有数据）
uploads/                     # 图片目录（可保留已有数据）
```

#### 5. 运行

```cmd
# Windows
running-tracker.exe

# 后台运行（Windows）
start /B running-tracker.exe
```

### 支持的 targets

| Target | 说明 |
|--------|------|
| `node18-win-x64` | Windows 64 位 |
| `node18-win-arm64` | Windows ARM64 |
| `node18-linux-x64` | Linux 64 位 |
| `node18-linux-arm64` | Linux ARM64 |
| `node18-macos-x64` | macOS 64 位 |
| `node18-macos-arm64` | macOS Apple Silicon |

### 多平台打包

```bash
pkg . --targets node18-win-x64,node18-linux-x64 --out-path dist
```

---

## 方式二：Docker 容器部署

### 1. 创建 Dockerfile

```dockerfile
FROM node:18-alpine

# 安装 Python 和 PaddleOCR 依赖
RUN apk add --no-cache python3 py3-pip && \
    pip3 install paddlepaddle paddleocr

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "backend/server.js"]
```

### 2. 构建镜像

```bash
docker build -t running-tracker .
```

### 3. 运行容器

```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/uploads \
  --name running-tracker \
  running-tracker
```

### 4. docker-compose.yml

```yaml
version: '3.8'

services:
  running-tracker:
    image: running-tracker:latest
    container_name: running-tracker
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
```

运行：

```bash
docker-compose up -d
```

---

## 方式三：传统 npm 部署

### 1. 在目标服务器安装 Node.js 18+

下载地址：https://nodejs.org/

### 2. 安装 Python 3.8+ 和 PaddleOCR

```bash
# Windows
pip install paddlepaddle paddleocr

# Linux
pip3 install paddlepaddle paddleocr
```

### 3. 部署代码

```bash
# 方式 1: 克隆 Git 仓库
git clone <repository-url>
cd Running-tracker

# 方式 2: 直接复制源码
```

### 4. 安装依赖

```bash
npm install --production
```

### 5. 配置 systemd 服务（Linux）

创建服务文件 `/etc/systemd/system/running-tracker.service`：

```ini
[Unit]
Description=Running Tracker Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/Running-tracker
ExecStart=/usr/bin/node backend/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl start running-tracker
sudo systemctl enable running-tracker
```

### 6. 配置 Windows 服务（NSSM）

```cmd
# 下载 NSSM: https://nssm.cc/download

# 安装服务
nssm install RunningTracker

# 配置
nssm set RunningTracker Application "C:\nodejs\node.exe"
nssm set RunningTracker ApplicationParameters "C:\Running-tracker\backend\server.js"
nssm set RunningTracker StartDirectory "C:\Running-tracker"
nssm set RunningTracker DisplayName "Running Tracker"
nssm set RunningTracker StartService SERVICE_AUTO_START

# 启动服务
nssm start RunningTracker
```

---

## 部署检查清单

- [ ] Node.js 18+ 或可执行文件已准备
- [ ] Python 3.8+ 已安装
- [ ] PaddleOCR 已安装 (`pip install paddlepaddle paddleocr`)
- [ ] 端口 3000 未被占用
- [ ] 防火墙已开放 3000 端口
- [ ] data/ 和 uploads/ 目录有写入权限
- [ ] 服务已配置开机自启

---

## 常见问题

### 1. pkg 打包后找不到模块

确保 `package.json` 中配置了正确的 `pkg` 字段：

```json
{
  "pkg": {
    "scripts": ["backend/*.js"],
    "assets": ["frontend/**/*", "backend/paddle_ocr.py"]
  }
}
```

### 2. PaddleOCR 模型下载失败

PaddleOCR 首次运行会自动下载模型，如网络问题可手动下载：

```bash
# 预下载模型
python -c "from paddleocr import PaddleOCR; OCR = PaddleOCR()"
```

### 3. 端口被占用

修改端口：

```bash
# Windows
set PORT=3001 && node backend/server.js

# Linux
PORT=3001 node backend/server.js
```

或在代码中修改 `server.js` 的默认端口。

### 4. 中文路径问题

确保项目路径不包含中文或特殊字符，可能导致 OCR 失败。

---

## 性能优化建议

1. **生产环境**：使用 `npm install --production` 减少依赖体积
2. **图片存储**：大文件建议存储到 OSS/云存储
3. **数据库**：数据量大时建议迁移到 MySQL/MongoDB
4. **反向代理**：使用 Nginx 做反向代理和 HTTPS 终止
5. **进程守护**：使用 PM2（Linux）或 NSSM（Windows）保证服务稳定

---

## 升级流程

### pkg 打包版本

```bash
# 1. 拉取最新代码
git pull

# 2. 重新打包
npm run build

# 3. 停止旧服务
# 4. 替换可执行文件
# 5. 启动新服务
```

### npm 部署版本

```bash
# 1. 拉取最新代码
git pull

# 2. 更新依赖
npm install

# 3. 重启服务
sudo systemctl restart running-tracker
```

---

**需要帮助？** 查看项目 Issues 或联系开发者。

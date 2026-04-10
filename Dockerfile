FROM node:20-slim

# 安装 Python 和 PaddleOCR 依赖
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --break-system-packages paddlepaddle==2.6.2 paddleocr==2.9.1

# 设置工作目录
WORKDIR /app

# 复制 package.json 并安装依赖
COPY package*.json ./
RUN npm install --production

# 复制项目文件
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY data/ ./data/
COPY uploads/ ./uploads/

# 暴露端口
EXPOSE 3000

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 启动命令
CMD ["node", "backend/server.js"]

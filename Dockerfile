FROM node:18-alpine

# 安装 Python 和 PaddleOCR 依赖
RUN apk add --no-cache python3 py3-pip py3-numpy py3-pillow && \
    pip3 install --break-system-packages paddlepaddle paddleocr

# 设置工作目录
WORKDIR /app

# 复制 package.json 并安装依赖
COPY package*.json ./
RUN npm install --production

# 复制项目文件
COPY . .

# 创建数据目录
RUN mkdir -p /app/data /app/uploads

# 暴露端口
EXPOSE 3000

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 启动命令
CMD ["node", "backend/server.js"]

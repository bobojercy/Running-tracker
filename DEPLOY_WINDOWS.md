# Windows 服务器部署指南

## 环境要求

| 组件 | 版本 | 下载地址 |
|------|------|----------|
| Node.js | 18.x 或更高 | https://nodejs.org/ |
| Python | 3.8 或更高 | https://www.python.org/ |
| Git (可选) | 最新版 | https://git-scm.com/ |

## 部署步骤

### 1. 安装 Node.js

1. 下载 Windows 安装包（推荐 LTS 版本）
2. 双击安装，勾选"Add to PATH"
3. 验证安装：
   ```cmd
   node --version
   npm --version
   ```

### 2. 安装 Python

1. 下载 Python 3.8+ Windows 安装包
2. **重要**：安装时勾选 "Add Python to PATH"
3. 验证安装：
   ```cmd
   python --version
   ```

### 3. 安装 PaddleOCR 依赖

```cmd
pip install paddlepaddle paddleocr
```

### 4. 复制项目文件

将整个 `running-tracker` 文件夹复制到 Windows 服务器，例如：
```
D:\running-tracker\
```

### 5. 安装 Node.js 依赖

```cmd
cd D:\running-tracker
npm install
```

### 6. 测试运行

```cmd
cd D:\running-tracker
node backend/server.js
```

看到以下输出表示成功：
```
🏃 跑步追踪器已启动!
📱 本地访问：http://localhost:3000
```

### 7. 配置 Windows 开机自启

#### 方案 A：使用 NSSM（推荐）

1. 下载 NSSM：https://nssm.cc/download
2. 解压到 `C:\nssm\`
3. 以管理员身份运行 CMD，执行：

```cmd
C:\nssm\nssm.exe install RunningTracker
```

4. 在弹出窗口中配置：
   - **Path**: `C:\Program Files\nodejs\node.exe` (根据实际路径)
   - **Startup directory**: `D:\running-tracker`
   - **Arguments**: `backend/server.js`

5. 点击 "Install service"
6. 启动服务：
```cmd
nssm start RunningTracker
```

#### 方案 B：使用任务计划程序

1. 打开"任务计划程序"
2. 创建基本任务：
   - 名称：`RunningTracker`
   - 触发器：`计算机启动时`
   - 操作：`启动程序`
   - 程序：`node.exe`
   - 参数：`backend/server.js`
   - 起始目录：`D:\running-tracker`

### 8. 配置防火墙

开放 3000 端口：

```cmd
netsh advfirewall firewall add rule name="RunningTracker" dir=in action=allow protocol=TCP localport=3000
```

### 9. 访问服务

- 本地访问：`http://localhost:3000`
- 远程访问：`http://服务器IP:3000`

## 日志位置

- 输出日志：`D:\running-tracker\logs\out.log`
- 错误日志：`D:\running-tracker\logs\error.log`

## 常用命令

### NSSM 管理
```cmd
# 查看状态
nssm status RunningTracker

# 重启服务
nssm restart RunningTracker

# 停止服务
nssm stop RunningTracker

# 删除服务
nssm remove RunningTracker
```

### 手动运行
```cmd
cd D:\running-tracker
node backend/server.js
```

## 注意事项

1. **路径问题**：Windows 使用反斜杠 `\`，但 Node.js 通常能自动处理
2. **端口占用**：确保 3000 端口未被占用
3. **文件权限**：确保运行账户对 `data/` 和 `uploads/` 目录有写权限
4. **Python 路径**：如果 OCR 失败，检查 `backend/ocr.js` 中的 `python3.8` 是否需要改为 `python`

## 故障排查

### 服务无法启动
```cmd
# 查看 NSSM 日志
nssm status RunningTracker

# 手动运行查看错误
cd D:\running-tracker
node backend/server.js
```

### OCR 识别失败
```cmd
# 检查 Python 是否可用
python --version

# 检查 PaddleOCR 是否安装
pip list | findstr paddle
```

### 端口被占用
```cmd
# 查看占用 3000 端口的进程
netstat -ano | findstr :3000

# 终止进程（替换 PID）
taskkill /F /PID <PID>
```

## 备份建议

定期备份以下文件：
- `data/runs.json` - 跑步记录
- `data/config.json` - 人员配置
- `uploads/` - 截图文件（如需要）

---

部署完成后，如有问题请查看日志或联系管理员。

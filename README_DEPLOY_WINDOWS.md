# 🚀 快速部署说明（Windows）

## 打包好的可执行文件部署

### 1. 准备文件

将以下文件复制到目标服务器：

```
📁 部署目录/
├── running-tracker.exe    # 主程序（从 dist/目录复制）
├── install.bat            # 安装启动脚本
├── data/                  # 数据存储目录（可保留已有数据）
└── uploads/               # 图片存储目录（可保留已有数据）
```

### 2. 运行安装

双击 `install.bat` 或在命令行执行：

```cmd
install.bat
```

脚本会自动：
- ✅ 检查 Python 环境
- ✅ 安装 PaddleOCR（如未安装）
- ✅ 创建必要目录
- ✅ 启动服务

### 3. 访问系统

打开浏览器访问：**http://localhost:3000**

---

## 手动部署

### 第一步：安装 Python

1. 下载 Python 3.8+：https://www.python.org/downloads/
2. 安装时勾选 "Add Python to PATH"

### 第二步：安装 PaddleOCR

打开命令行执行：

```cmd
pip install paddlepaddle paddleocr
```

### 第三步：运行程序

```cmd
running-tracker.exe
```

---

## 开机自启动

### 方式 1：创建快捷方式

1. 右键 `running-tracker.exe` → 创建快捷方式
2. 将快捷方式复制到启动文件夹：
   - 按 `Win + R`，输入 `shell:startup`
   - 粘贴快捷方式

### 方式 2：使用 NSSM 配置为 Windows 服务

1. 下载 NSSM：https://nssm.cc/download
2. 解压到 `C:\nssm\`

3. 安装服务：
```cmd
cd C:\nssm
nssm install RunningTracker
```

4. 配置服务：
- Application: `路径\running-tracker.exe`
- Startup directory: `程序所在目录`

5. 启动服务：
```cmd
nssm start RunningTracker
```

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 服务端口 |

修改端口示例：

```cmd
set PORT=3001
running-tracker.exe
```

---

## 防火墙配置

如需允许其他设备访问，请开放端口：

### Windows 防火墙

```cmd
netsh advfirewall firewall add rule name="Running Tracker" dir=in action=allow protocol=TCP localport=3000
```

---

## 数据备份

重要数据文件：

```
data/
├── runs.json        # 跑步记录
└── config.json      # 人员配置

uploads/             # 截图文件（可选备份）
```

建议定期备份 `data/` 目录。

---

## 卸载

1. 停止服务（如配置了 NSSM 服务）：
```cmd
nssm stop RunningTracker
nssm remove RunningTracker
```

2. 删除程序文件和数据

---

## 常见问题

### Q: Python 找不到？
A: 确保 Python 已添加到系统 PATH 环境变量

### Q: PaddleOCR 安装失败？
A: 尝试使用国内镜像：
```cmd
pip install paddlepaddle paddleocr -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### Q: 端口被占用？
A: 修改端口：
```cmd
set PORT=3001
running-tracker.exe
```

### Q: 首次启动很慢？
A: 首次运行会下载 OCR 模型（约 100MB），请耐心等待

---

**需要帮助？** 联系开发者或查看项目 Issues

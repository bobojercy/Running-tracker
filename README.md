# 轻跑如风 - 跑步里程追踪器

> 通过悦跑圈/Keep 等跑步 APP 截图自动识别跑步数据，支持多人分组管理和数据统计分析

![版本](https://img.shields.io/badge/版本-1.2.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![许可证](https://img.shields.io/badge/许可证-MIT-yellow.svg)

## ✨ 核心功能

### 📸 智能 OCR 识别
- 上传跑步截图，自动识别距离、配速、时长、卡路里
- 支持 PaddleOCR + Tesseract 双重识别，提高识别准确率
- 自动识别日期，智能校验数据合理性

### 👥 人员与组别管理
- **人员管理**：新增、编辑、删除人员
- **组别管理**：新增、修改、删除组别
- **分组管理**：人员可调整组别，支持自定义组别名称
- **明细查看**：查看每人所有跑步记录和截图

### 📊 数据统计分析
- **首页仪表盘**：总跑量、本月跑量、本周跑量、卡路里消耗
- **按天统计**：每日跑量趋势
- **按月统计**：每月跑量汇总
- **人员排名**：个人跑量、配速、卡路里排名
- **组别 PK**：各组成员跑量汇总对比

### 💾 数据管理
- JSON 文件存储，易于迁移和备份
- 一人一天仅允许一条有效记录，防止重复提交
- 支持数据有效性校验（距离≥3km，配速<12 分/km）

### 📱 响应式设计
- 支持 PC 和手机端访问
- 自适应布局，完美适配各种屏幕尺寸
- 统一 UI 风格，操作流畅

## 🎯 适用场景

- 🏢 公司/部门跑步打卡活动
- 🏃 跑团里程统计与 PK
- 👨‍‍👧👦 家庭跑步记录
- 📝 个人跑步数据管理

## 🛠️ 技术栈

| 组件 | 技术 |
|------|------|
| **前端** | HTML5 + CSS3 + JavaScript (原生) |
| **后端** | Node.js 18+ + Express |
| **OCR** | PaddleOCR + Tesseract.js |
| **图片处理** | Sharp |
| **存储** | JSON 文件 (data/runs.json, data/config.json) |
| **部署** | systemd 服务 (Linux) / NSSM (Windows) |

## 📦 快速启动

### 环境要求

- Node.js 18+
- Python 3.8+
- PaddlePaddle

### Linux / macOS

```bash
# 1. 克隆项目
git clone <repository-url>
cd Running-tracker

# 2. 安装 Node.js 依赖
npm install

# 3. 安装 PaddleOCR
pip3 install paddlepaddle paddleocr

# 4. 启动服务
npm start

# 访问 http://localhost:3000
```

### Windows

```cmd
# 1. 安装 Node.js 和 Python 3.8+

# 2. 克隆项目并安装依赖
git clone <repository-url>
cd Running-tracker
npm install

# 3. 安装 PaddleOCR
pip install paddlepaddle paddleocr

# 4. 启动服务
npm start

# 访问 http://localhost:3000
```

### 开发模式

```bash
# 支持热重载，适合开发调试
npm run dev
```

## 📁 目录结构

```
Running-tracker/
├── backend/                # 后端服务
│   ├── server.js           # 主服务 + API 接口
│   ├── ocr.js              # OCR 识别逻辑
│   ├── config.js           # 人员配置管理
│   └── paddle_ocr.py       # PaddleOCR 脚本
├── frontend/               # 前端页面
│   ├── index.html          # 首页（仪表盘）
│   ├── upload.html         # 上传页面
│   ├── stats.html          # 统计页面
│   ├── runners.html        # 人员管理页面
│   └── details.html        # 跑步明细页面
├── data/                   # 数据存储
│   ├── runs.json           # 跑步记录
│   └── config.json         # 人员与组别配置
├── uploads/                # 截图上传目录
├── package.json            # 依赖配置
└── README.md               # 项目说明
```

## 📸 使用流程

1. **配置人员** - 访问 `/runners` 页面，添加人员和组别
2. **上传截图** - 访问 `/upload` 页面，选择人员，上传跑步截图
3. **OCR 识别** - 自动识别距离、配速、时长、卡路里、日期
4. **确认保存** - 检查识别结果，确认后保存
5. **查看统计** - 访问 `/stats` 页面查看统计分析和排名
6. **人员管理** - 访问 `/runners` 页面管理人员、组别和查看明细

## 🎨 页面说明

| 页面 | 路径 | 功能 |
|------|------|------|
| 🏠 首页 | `/` | 总跑量、跑步次数、本月/本周数据概览 |
| 📤 上传 | `/upload` | 上传截图、OCR 识别、确认保存 |
| 📊 统计 | `/stats` | 按天/月统计、组别 PK、个人排名 |
| 📋 明细 | `/details` | 查看所有跑步记录明细 |
| 👥 人员 | `/runners` | 人员管理、组别管理、个人明细 |

## 🔌 API 接口

### 跑步记录

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/upload` | POST | 上传截图并识别 |
| `/api/preview` | POST | 预览识别结果（不保存） |
| `/api/save` | POST | 保存识别结果 |
| `/api/runs` | GET | 获取跑步记录（支持按人员/组别筛选） |
| `/api/runs/:id` | DELETE | 删除记录 |

### 统计接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/stats/daily` | GET | 按天统计 |
| `/api/stats/monthly` | GET | 按月统计 |
| `/api/stats/total` | GET | 总跑量统计 |
| `/api/stats/by-runner` | GET | 按人员统计 |
| `/api/stats/by-group` | GET | 按组别统计 |
| `/api/dashboard` | GET | 仪表盘数据 |

### 配置接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/config` | GET | 获取人员与组别配置 |
| `/api/config/runner` | POST | 添加/修改人员 |
| `/api/config/runner/:name` | DELETE | 删除人员 |
| `/api/config/group` | POST | 新增/修改/删除组别 |
| `/api/runners` | GET | 获取人员列表 |

## 📊 数据格式

### 跑步记录 (runs.json)

```json
{
  "runs": [
    {
      "id": "uuid",
      "runner": "张三",
      "date": "2026-04-01",
      "distance": 5.23,
      "pace": "6'30\"",
      "paceMinPerKm": 6.5,
      "duration": "00:34:00",
      "calories": 320,
      "imageUrl": "/uploads/xxx.jpg",
      "isValid": true,
      "rawOcrText": "OCR 识别原始文本",
      "createdAt": "2026-04-01T10:00:00Z"
    }
  ],
  "updatedAt": "2026-04-01T10:00:00Z"
}
```

### 人员配置 (config.json)

```json
{
  "groups": ["第一组", "第二组", "欢乐组"],
  "runners": [
    {"name": "张三", "group": "第一组"},
    {"name": "李四", "group": "第二组"}
  ]
}
```

## ⚙️ 配置说明

### 有效数据规则

| 规则 | 说明 |
|------|------|
| 距离 | ≥ 3 公里 |
| 配速 | < 12 分/公里 |
| 记录限制 | 一人一天仅允许一条有效记录 |

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 服务端口 |
| `NODE_ENV` | production | 运行环境 |

## 🔧 运维命令

### Linux (systemd)

```bash
# 查看状态
sudo systemctl status running-tracker

# 启动服务
sudo systemctl start running-tracker

# 重启服务
sudo systemctl restart running-tracker

# 停止服务
sudo systemctl stop running-tracker

# 开机自启
sudo systemctl enable running-tracker

# 查看日志
sudo journalctl -u running-tracker -f
```

### Windows (命令行)

```cmd
# 启动服务
npm start

# 停止服务
# Ctrl + C 终止
```

## 📝 更新日志

### v1.2.0 (2026-04-08)

**新增**
- ✅ 组别管理功能（新增、修改、删除组别）
- ✅ 人员删除功能
- ✅ 统一确认对话框 UI
- ✅ 移动端响应式优化
- ✅ 导航菜单顺序统一

**优化**
- 🎨 UI 样式优化，界面更清爽
- 📱 移动端按钮横向滚动
- 🎯 下拉框样式美化

详见 [CHANGELOG.md](CHANGELOG.md)

## ❓ 常见问题

### OCR 识别失败

1. 检查 Python 和 PaddleOCR 是否正确安装
2. 确认图片格式为 jpg/png/webp
3. 截图应包含完整的跑步数据信息

### 服务无法启动

1. 检查端口 3000 是否被占用
2. 确认 `npm install` 已完成
3. 查看日志文件定位错误原因

### 人员无法删除

- 如该人员有跑步记录，需先删除相关记录
- 组别中有人员时无法删除组别

## 📄 许可证

MIT License

## 🙏 致谢

- **OCR 引擎**: [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)
- **图标库**: [Font Awesome](https://fontawesome.com/)
- **图片处理**: [Sharp](https://github.com/lovell/sharp)

---

**有问题或建议？** 欢迎提 Issue 或 PR！

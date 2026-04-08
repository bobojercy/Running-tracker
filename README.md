# 🏃 跑步里程追踪器

通过悦跑圈/Keep 等跑步 APP 截图自动识别跑步数据，支持多人分组管理和数据统计分析。

## ✨ 核心功能

- 📸 **智能 OCR 识别** - 上传跑步截图，自动识别距离、配速、时长、卡路里
- 👥 **人员分组管理** - 支持多人员、多组别管理，可按组查看统计
- 📊 **数据统计分析** - 总跑量、月跑量、周排名、个人明细
- 🏆 **组别 PK** - 按组别统计总跑量、人均跑量排名
- 💾 **数据持久化** - JSON 文件存储，易迁移备份
- 📱 **响应式设计** - 支持 PC 和手机端访问
- 🔄 **自动刷新** - 服务异常自动重启（systemd 守护）

## 🎯 适用场景

- 公司/团队跑步打卡活动
- 跑团里程统计
- 家庭跑步记录
- 个人跑步数据管理

## 🛠️ 技术栈

| 组件 | 技术 |
|------|------|
| **前端** | HTML5 + CSS3 + JavaScript (原生) |
| **后端** | Node.js 18+ + Express |
| **OCR** | PaddleOCR (中文识别率高) |
| **存储** | JSON 文件 (data/runs.json) |
| **部署** | systemd 服务 / NSSM (Windows) |

## 📦 快速启动

### Linux 服务器

```bash
# 1. 安装依赖
cd running-tracker
npm install

# 2. 安装 Python 和 PaddleOCR
pip3 install paddlepaddle paddleocr

# 3. 启动服务
node backend/server.js

# 或使用 systemd 服务（已配置）
sudo systemctl start running-tracker
sudo systemctl enable running-tracker  # 开机自启

# 访问 http://localhost:3000
```

### Windows 服务器

```cmd
# 1. 安装 Node.js 和 Python 3.8+

# 2. 安装依赖
npm install
pip install paddlepaddle paddleocr

# 3. 启动服务
node backend/server.js

# 或使用 NSSM 配置为 Windows 服务（详见 DEPLOY_WINDOWS.md）
```

## 📁 目录结构

```
running-tracker/
├── backend/              # 后端服务
│   ├── server.js         # 主服务 + API
│   ├── ocr.js            # OCR 识别逻辑
│   ├── config.js         # 人员配置管理
│   └── paddle_ocr.py     # PaddleOCR 脚本
├── frontend/             # 前端页面
│   ├── index.html        # 首页（仪表盘）
│   ├── upload.html       # 上传页面
│   ├── stats.html        # 统计页面
│   └── runners.html      # 人员管理
├── data/                 # 数据存储
│   ├── runs.json         # 跑步记录
│   └── config.json       # 人员配置
├── uploads/              # 截图上传目录
├── scripts/              # 辅助脚本
├── package.json          # 依赖配置
└── start.sh              # 启动脚本
```

## 📸 使用流程

1. **上传截图** - 访问 `/upload` 页面，选择人员和日期，上传悦跑圈/Keep 截图
2. **OCR 识别** - 自动识别距离、配速、时长、卡路里
3. **确认保存** - 检查识别结果，确认后保存
4. **查看统计** - 在 `/stats` 页面查看个人/组别统计
5. **人员管理** - 在 `/runners` 页面管理人员分组和查看明细

## 🎨 页面说明

| 页面 | 路径 | 功能 |
|------|------|------|
| 首页 | `/` | 总跑量、跑步次数、本月跑量、最近记录 |
| 上传 | `/upload` | 上传截图、OCR 识别、确认保存 |
| 统计 | `/stats` | 按天/月/年统计、组别 PK、个人排名 |
| 人员 | `/runners` | 人员列表、分组管理、跑步明细 |

## 🔌 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/upload` | POST | 上传截图并识别 |
| `/api/preview` | POST | 预览识别结果（不保存） |
| `/api/save` | POST | 保存识别结果 |
| `/api/runs` | GET | 获取跑步记录（支持按人员筛选） |
| `/api/runs/:id` | DELETE | 删除记录 |
| `/api/stats/daily` | GET | 按天统计 |
| `/api/stats/monthly` | GET | 按月统计 |
| `/api/stats/total` | GET | 总跑量统计 |
| `/api/stats/by-runner` | GET | 按人员统计 |
| `/api/stats/by-group` | GET | 按组别统计 |
| `/api/config` | GET | 获取人员配置 |
| `/api/config/runner` | POST | 添加/修改人员 |

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
      "rawOcrText": "OCR 识别原始文本...",
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

- 距离 ≥ 3 公里
- 配速 < 12 分/公里
- 一人一天只能有一条有效记录

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

# 重启服务
sudo systemctl restart running-tracker

# 查看日志
sudo journalctl -u running-tracker -f

# 日志位置
tail -f /var/log/running-tracker/out.log
```

### Windows (NSSM)

```cmd
# 查看状态
nssm status RunningTracker

# 重启服务
nssm restart RunningTracker

# 日志位置
type C:\nssm\RunningTracker\stdout.log
```

## 📝 更新日志

详见 [CHANGELOG.md](CHANGELOG.md)

## 📄 许可证

MIT License

## 🙏 致谢

- OCR: [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)
- UI: [Font Awesome](https://fontawesome.com/)

---

**开发/部署问题？** 查看 [DEPLOY_WINDOWS.md](DEPLOY_WINDOWS.md) 获取详细部署指南。

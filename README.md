# 🏃 跑步里程追踪器

通过悦跑圈截图自动识别跑步数据，统计跑量排名。

## 功能

- 📸 上传跑步截图，OCR 自动识别里程和配速
- ✅ 智能过滤：≥3km 且配速<12 分/km 的数据才有效
- 👥 人员管理：支持 11 位预设人员，上传时选择
- 📅 手动选择跑步日期（截图可能不含日期或日期不准确）
- 📊 多维度统计：按人员/按天/按月/总跑量排名
- 💾 数据持久化存储

## 技术栈

- **前端**: HTML + CSS + JavaScript (原生)
- **后端**: Node.js + Express
- **OCR**: Tesseract.js (中文识别)
- **存储**: JSON 文件 (轻量级，易迁移)

## 快速启动

```bash
# 安装依赖
cd running-tracker
npm install

# 启动服务
npm start

# 访问 http://localhost:3000
```

## 目录结构

```
running-tracker/
├── frontend/          # 前端页面
│   ├── index.html     # 主页面
│   ├── upload.html    # 上传页面
│   └── stats.html     # 统计页面
├── backend/           # 后端服务
│   ├── server.js      # 主服务
│   └── ocr.js         # OCR 识别
├── data/              # 数据存储
│   └── runs.json      # 跑步记录
├── uploads/           # 截图上传目录
└── package.json
```

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/upload` | POST | 上传截图 + 日期 |
| `/api/runs` | GET | 获取所有记录 |
| `/api/runs` | DELETE | 删除记录 |
| `/api/stats/daily` | GET | 按天统计 |
| `/api/stats/monthly` | GET | 按月统计 |
| `/api/stats/total` | GET | 总跑量排名 |

## 数据格式

```json
{
  "id": "uuid",
  "date": "2026-03-31",
  "distance": 5.23,
  "pace": "6'30\"",
  "paceMinPerKm": 6.5,
  "duration": "34:00",
  "calories": 320,
  "imageUrl": "/uploads/xxx.png",
  "createdAt": "2026-03-31T10:00:00Z"
}
```

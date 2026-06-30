# 奶牛行为智能检测系统 V1.1

基于 YOLOv11 深度学习模型的牛只行为实时检测与监控系统。支持浏览器端 AI 推理、多模型切换、结构化数据持久化、异常行为自动告警。

## 功能特性

### 核心检测
- **图片检测** — 上传牛只图片，一键输出行为识别结果（站立/行走/躺卧/进食/饮水）
- **视频检测** — 上传监控视频，逐帧实时分析并绘制检测标注框
- **实时摄像头** — 接入本地摄像头，全天候在线实时监测

### 监控与告警
- **实时监控中心** — 可视化仪表盘：检测画面 + 行为分布统计 + 历史告警列表
- **异常检测引擎** — 牛只连续躺卧超时自动分级告警（3 分钟警告 / 10 分钟紧急）
- **摄像头离线检测** — 30 秒无数据自动触发离线提醒
- **告警通知** — 浏览器弹窗横幅 + 提示音 + 一键确认处理

### 模型管理
- **多模型支持** — 支持自定义添加/切换 ONNX 模型
- **置信度调节** — 检测阈值滑块实时调整，动态生效

### 数据管理
- **结构化持久化** — 检测结果实时写入 PostgreSQL，支持历史回溯
- **RESTful API** — 检测数据上报、告警查询、统计接口

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router) + React 18 + TypeScript |
| 样式 | Tailwind CSS 3 |
| AI 推理 | ONNX Runtime Web（浏览器端 YOLOv11） |
| 后端 | Next.js API Routes |
| ORM | Prisma 7 |
| 数据库 | PostgreSQL (Neon Serverless / Docker) |
| 部署 | Vercel |

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── detection/route.ts    # POST 接收检测数据 / GET 查询历史
│   │   ├── alerts/route.ts       # GET/POST/PATCH 告警管理
│   │   └── stats/route.ts        # GET 仪表盘统计
│   ├── monitor/page.tsx          # 实时监控中心页面
│   ├── layout.tsx                # 根布局
│   └── page.tsx                  # 首页：检测工作台
├── components/
│   ├── DetectionUI.tsx           # 核心检测工作台（双栏布局）
│   ├── ModelSettings.tsx         # 模型管理 + 置信度调节
│   ├── FunctionPanel.tsx         # 功能按钮面板
│   ├── DetectionResultPanel.tsx  # 结构化检测结果列表
│   ├── AlertPanel.tsx            # 告警通知组件
│   └── StatsPanel.tsx            # 统计面板组件
├── lib/
│   ├── db.ts                     # PrismaClient 懒加载单例
│   ├── store.ts                  # 数据访问层（Prisma 查询）
│   └── anomalyDetector.ts        # 异常检测状态机引擎
└── utils/
    ├── detector.ts               # YOLO 推理管线 + 多模型管理
    ├── dataSender.ts             # 客户端数据定时上报
    └── types.ts                  # 共享类型定义
```

## 快速开始

### 环境要求

- Node.js 20+
- PostgreSQL（本地 Docker 或 Neon 云数据库）

### 本地开发

```bash
# 克隆项目
git clone https://github.com/cc1239539190-lgtm/cow-behavior-detection.git
cd cow-behavior-detection

# 安装依赖
npm install

# 配置数据库（二选一）

# 方案 A：Docker 本地 PostgreSQL
docker run -d --name pg-dev -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=123456 -e POSTGRES_DB=mydb -p 5432:5432 postgres:latest

# 方案 B：Neon 云数据库
# 访问 https://neon.tech 创建免费项目，获取连接串

# 配置环境变量
# 编辑 .env 文件，填入 DATABASE_URL

# 同步数据库表结构
npx prisma db push

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 即可使用。

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/detection` | 上报检测数据 |
| `GET` | `/api/detection?cameraId=xxx` | 查询检测历史 |
| `GET` | `/api/alerts` | 获取告警列表 |
| `PATCH` | `/api/alerts` | 确认处理告警 |
| `GET` | `/api/stats` | 获取仪表盘统计数据 |

### 检测数据上报示例

```json
POST /api/detection
{
  "cameraId": "camera-01",
  "source": "camera",
  "detections": [
    {
      "x1": 100, "y1": 150, "x2": 320, "y2": 420,
      "conf": 0.92, "cls": 3, "className": "standing"
    }
  ],
  "frameWidth": 640,
  "frameHeight": 480
}
```

## 数据库

### 数据模型

```
detection_frames (帧) 1──N detection_boxes (检测框)
alerts (告警记录)
```

### 迁移

```bash
# 同步 schema 到数据库（开发）
npx prisma db push

# 生成迁移文件（生产）
npx prisma migrate dev --name init
```

## 自定义模型

将训练好的 ONNX 模型文件放入 `public/` 目录，在检测页面的"模型/参数设置"面板中添加即可切换。默认模型为 `best.onnx`，支持 YOLOv11 导出的 ONNX 格式。

## 部署

### Vercel

1. Fork 本仓库
2. 在 Vercel 中导入项目
3. 设置环境变量 `DATABASE_URL`（Neon 连接串）
4. 部署

### 环境变量

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 |

## License

MIT

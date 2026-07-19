# 梅花易数 · 时辰起卦

> 观象于天，取数于时

一个基于《梅花易数》时间起卦法的双色球与大乐透号码娱乐工具。应用使用北京时间、农历日期和时辰生成本卦、变卦、互卦，并将卦象信息确定性地映射为两种彩票号码。同一时辰、同一彩种的结果可复现，不使用随机数。

在线体验：<https://peiorange888.github.io/meihua-lottery/>

## 功能

- 使用北京时间和农历年月日时起卦，展示本卦、变卦、互卦、动爻及体用关系
- 分别生成福彩双色球（6 红 + 1 蓝）和体彩大乐透（5 前区 + 2 后区）
- 展示每个号码的推导来源、归藏结果和确定性去重过程
- 同一时辰缓存结果，重复起卦不会重复写入预测记录或增加计数
- 提供体用、时令和动爻组成的气运解读；气运不参与号码生成
- 记录当期预测，自动获取开奖结果并匹配命中号码
- 按时间筛选历史中奖记录，保留所有已结算预测及命中数量
- 支持桌面、平板和移动端，并提供键盘操作、状态播报和减少动画支持

## 算法概览

### 时间起卦

应用按传统时间起卦流程计算：

1. 读取北京时间，并换算为农历年支数、农历月、农历日和时辰数。
2. `上卦 = 年支数 + 农历月 + 农历日` 归藏到 8。
3. `下卦 = 年支数 + 农历月 + 农历日 + 时辰数` 归藏到 8。
4. 同一总数归藏到 6，得到动爻；据此推导变卦和互卦。
5. 根据动爻所在卦确定用卦，另一卦为体卦，再计算体用五行生克关系。

归藏公式为 `归藏(n, max) = n % max === 0 ? max : n % max`，结果始终落在 `[1, max]`。

### 号码映射

双色球和大乐透使用各自的号码范围，分别从本卦序、变卦序、互卦序、体用、动爻、时辰及农历信息生成候选号码。候选号码重复时，使用卦象数据计算固定步长进行调整，因此同一卦象始终得到相同结果。

彩票号码只是卦象的娱乐性映射，不代表任何真实概率优势，也不构成投注建议。

## 技术栈

- 原生 HTML、CSS 和 JavaScript
- Firebase Realtime Database：保存公开预测、开奖和结算数据
- GitHub Actions + Firebase Admin SDK：每 30 分钟结算待开奖记录
- GitHub Pages：托管静态页面
- Node.js：运行测试、数据导出和后台结算脚本

## 本地运行

直接在浏览器打开 `index.html`，或使用 Python 启动一个静态文件服务器：

```bash
python3 -m http.server 8080
```

然后访问 <http://localhost:8080>。

安装依赖并运行核心测试：

```bash
npm ci
npm test
```

导出 Firebase 数据到本地 `backups/` 目录：

```bash
node scripts/export-data.mjs
```

视觉回归脚本仍保留在 `scripts/visual-check.mjs`，需要本机 Chrome 和 `codex-browser`；生成的临时文件位于 `tmp/visual-check/`，不会提交到仓库。

## 数据与安全

应用使用 Firebase Realtime Database 的 `lottery` 分支，保存所有访问者共享的预测数据。浏览器只创建符合规则的待结算记录，GitHub Actions 使用 Admin SDK 处理开奖结算。

静态网页无法完全隐藏 Firebase 写入入口，规则只能限制路径和数据形状，不能证明请求一定来自受信任的应用逻辑。部署前请阅读 [`SECURITY.md`](SECURITY.md)，并按 [`firebase-database.rules.json`](firebase-database.rules.json) 配置数据库规则。不要将 Firebase 服务账号或其他私密凭据提交到仓库。

## 部署

推送到 GitHub 后，在仓库的 **Settings → Pages** 中选择 **Deploy from a branch**，分支选择 `main`、目录选择 `/ (root)`。GitHub Actions 的定时结算还需要在仓库 Secrets 中配置 `FIREBASE_SERVICE_ACCOUNT`。

更完整的步骤见 [`DEPLOY.md`](DEPLOY.md)。

## 项目结构

```text
meihua-lottery/
├── index.html
├── assets/
│   ├── css/styles.css
│   └── js/                  # 配置、数据、算法、UI 和启动逻辑
├── scripts/
│   ├── test-core.mjs        # 核心算法测试
│   ├── export-data.mjs      # Firebase 数据导出
│   ├── settle-lottery-admin.mjs
│   └── visual-check.mjs     # 本地视觉回归
├── .github/workflows/       # 定时开奖结算
├── firebase-database.rules.json
├── DEPLOY.md
├── SECURITY.md
└── LICENSE
```

## 贡献与提交归因

欢迎提交 Issue 和 Pull Request。请在提交前运行 `npm test`，并说明涉及的算法、数据或界面变化。

GitHub 的贡献者列表依据 Git 提交中的作者邮箱与 GitHub 账号匹配，不依据“使用了哪个 AI 工具”判断。当前历史提交主要使用 `peiorange888@gmail.com` 和 `peiorange888@github.com`，它们都属于项目账号；少数提交带有 Claude 的 `Co-authored-by` trailers，所以 GitHub 可能显示 Claude，但不会自动生成 Codex 贡献者。若希望 GitHub 归因给另一位真实贡献者，应使用该贡献者已验证的 GitHub 邮箱，或在提交说明中加入其真实账号对应的 `Co-authored-by` trailer；不要使用无法映射到账号的虚构邮箱。

## 许可

本项目基于 [MIT License](LICENSE) 发布。

## 免责声明

彩票开奖结果是独立随机事件。本项目仅供学习和娱乐，请理性购彩，遵守当地法律法规。

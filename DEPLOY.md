# 部署指南

本项目可以免费部署到 GitHub Pages。

## 方式一：通过 GitHub 网页操作（推荐新手）

### 步骤 1：上传代码到 GitHub

1. 登录 GitHub，点击右上角 **+** → **New repository**
2. Repository name 填写：`meihua-lottery`
3. 选择 **Public**
4. 点击 **Create repository**

### 步骤 2：上传文件

1. 在新仓库页面，点击 **uploading an existing file**
2. 将整个项目文件拖拽到上传区域，至少包括：
   - `index.html`
   - `assets/css/styles.css`
   - `assets/js/*.js`
   - `README.md`
   - `DEPLOY.md`
3. 点击 **Commit changes**

### 步骤 3：启用 GitHub Pages

1. 进入仓库 **Settings**
2. 左侧菜单找到 **Pages**
3. Source 下选择 **Deploy from a branch**
4. Branch 选择 **main**，文件夹选择 **/ (root)**
5. 点击 **Save**
6. 等待 1-2 分钟

### 步骤 4：访问网站

在 **Pages** 页面顶部会显示你的网站链接：
```
https://你的用户名.github.io/meihua-lottery/
```

---

## 方式二：通过 Git 命令行操作

### 前置要求

1. 安装 Git
2. 配置 Git 用户信息：
   ```bash
   git config --global user.name "你的GitHub用户名"
   git config --global user.email "你的GitHub邮箱"
   ```
3. 生成 SSH 密钥或使用 Personal Access Token

### 步骤 1：初始化本地仓库

```bash
cd meihua-lottery
git init
git add .
git commit -m "Initial commit"
```

### 步骤 2：关联远程仓库

```bash
git remote add origin https://github.com/你的用户名/meihua-lottery.git
```

### 步骤 3：推送代码

```bash
git branch -M main
git push -u origin main
```

### 步骤 4：启用 GitHub Pages

按照上面的"方式一"的步骤 3 操作即可。

---

## 常见问题

### Q: GitHub Pages 部署后样式丢失？

A: 确认 `assets/css/styles.css` 已经上传，并且仓库保留了 `assets/` 目录结构。本项目使用相对路径加载 CSS 和 JS。

### Q: 页面可以打开，但按钮没有反应？

A: 确认 `assets/js/` 下的脚本文件都已上传。当前页面按顺序加载 `config.js`、`data.js`、`logic.js`、`ui.js`、`app.js`。

### Q: 访问时显示 404？

A: 等待 2-5 分钟后再试，GitHub Pages 需要时间部署。

### Q: 可以使用自定义域名吗？

A: 可以，在仓库 Settings → Pages → Custom domain 中添加你的域名即可。

---

## 其他免费部署平台

如果不使用 GitHub Pages，还可以考虑：

| 平台 | 特点 | 网址 |
|------|------|------|
| Vercel | 部署快速 | vercel.com |
| Netlify | 拖拽即可部署 | netlify.com |
| Cloudflare Pages | CDN 加速 | pages.cloudflare.com |

这些平台都支持直接导入 GitHub 仓库进行部署。

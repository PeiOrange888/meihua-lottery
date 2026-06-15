# 中奖更新问题修复指南

## 问题描述

从 2026-06-11 之后，GitHub Actions 定时结算脚本一直失败，导致开奖数据无法更新。

错误信息：`PUT https://meihua-abb40-default-rtdb.firebaseio.com/lottery/ssq.json failed: 401`

## 根本原因

1. Firebase 匿名写入权限有限制
2. GitHub Actions 运行时没有 Firebase 认证凭据
3. 脚本无法完成数据写入操作

## 解决方案（选择其一）

### 方案 A：配置 Firebase Admin SDK（推荐）

#### 步骤 1：生成 Firebase 服务账号密钥

1. 访问 [Firebase Console](https://console.firebase.google.com/)
2. 选择项目 `meihua-abb40`
3. 进入 **Project Settings** → **Service Accounts**
4. 点击 **Generate New Private Key**
5. 下载 JSON 密钥文件

#### 步骤 2：添加 GitHub Secrets

1. 打开 GitHub 仓库：https://github.com/PeiOrange888/meihua-lottery
2. 进入 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 名称：`FIREBASE_SERVICE_ACCOUNT`
5. 值：粘贴服务账号 JSON 文件的完整内容
6. 点击 **Add secret**

#### 步骤 3：更新结算脚本

修改 `scripts/settle-lottery.mjs`，使用 Firebase Admin SDK 替代 REST API。

#### 步骤 4：测试运行

1. 进入 **Actions** 标签页
2. 选择 **Settle lottery records** 工作流
3. 点击 **Run workflow** → **Run workflow**
4. 等待执行完成，检查是否成功

---

### 方案 B：放宽 Firebase 规则（临时方案，不安全）

**警告**：此方案允许任何人写入数据库，仅适合测试。

修改 Firebase Realtime Database 规则：

```json
{
  "rules": {
    "lottery": {
      ".read": true,
      ".write": true
    }
  }
}
```

---

### 方案 C：使用环境变量认证

如果 Firebase 支持 API 密钥认证，可以：

1. 在 Firebase Console 获取 Web API Key
2. 添加到 GitHub Secrets：`FIREBASE_API_KEY`
3. 在脚本中使用 API 密钥进行认证请求

---

## 推荐行动

**立即采用方案 A**，因为它：
- ✅ 最安全：服务账号权限可控
- ✅ 最稳定：不受匿名访问限制
- ✅ 符合最佳实践

## 临时解决方法

在修复 GitHub Actions 之前，可以手动运行本地脚本更新数据：

```bash
# 需要先放宽 Firebase 规则（方案 B）
node scripts/settle-lottery.mjs
```

或者直接在 Firebase Console 中手动更新 `lottery/ssq/result` 和 `lottery/dlt/result` 字段。

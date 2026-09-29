# Vapi Webhook Receiver - 部署指南

## 功能说明

这个后端服务接收 Vapi AI 语音机器人的通话结果，自动发送邮件通知。

**工作流程：**
```
客户打电话 → Vapi AI 接听 → 提取信息 → POST 到 /webhook → 发送邮件通知
```

---

## 前置准备

### 1. 注册必要账号

| 平台 | 用途 | 链接 |
|------|------|------|
| **Render** | 部署后端服务器 | https://render.com |
| **Gmail** | 发送邮件通知 | https://gmail.com |
| **Vapi** | AI 语音机器人平台 | https://vapi.ai |

### 2. 获取 Gmail App Password（重要）

**不能直接用 Gmail 登录密码，必须创建 App Password：**

1. 打开 https://myaccount.google.com/security
2. 开启「两步验证」（必须开启才能用 App Password）
3. 搜索「App passwords」或访问 https://myaccount.google.com/apppasswords
4. 选择应用类型：「Mail」
5. 选择设备：「Other (Custom name)」→ 输入 "Vapi Webhook"
6. 点击「Generate」
7. **复制生成的 16 位密码**（如：`abcd efgh ijkl mnop`）

⚠️ **这个密码只显示一次，务必保存好！**

---

## 部署步骤（Render 平台）

### 第一步：创建 GitHub 仓库

1. 打开 https://github.com
2. 点击右上角 **+** → **New repository**
3. 仓库名：`vapi-webhook-server`
4. 选择 **Public**
5. 点击 **Create repository**

### 第二步：上传代码

1. 在仓库页面，点击 **uploading an existing file**
2. 上传这两个文件：
   - `server.js`
   - `package.json`
3. 点击 **Commit changes**

### 第三步：在 Render 部署

1. 打开 https://dashboard.render.com
2. 点击 **New +** → **Web Service**
3. 选择 **Build and deploy from a Git repository**
4. 连接你的 GitHub 账号
5. 找到并选择 `vapi-webhook-server` 仓库
6. 配置：
   - **Name**: `vapi-webhook`（或任意名字）
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
7. 点击 **Create Web Service**

### 第四步：配置环境变量

1. 在 Render 控制台，点击你的服务
2. 左侧点击 **Environment**
3. 添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `EMAIL_USER` | 你的 Gmail 地址 | 如：`yourname@gmail.com` |
| `EMAIL_PASS` | Gmail App Password | 刚才生成的 16 位密码 |
| `NOTIFY_EMAIL` | 接收通知的邮箱 | 可以是同一个 Gmail |

4. 点击 **Save Changes**

### 第五步：获取 Webhook URL

1. 等待部署完成（约 2-3 分钟）
2. 在 Render 控制台，复制你的服务 URL：
   ```
   https://vapi-webhook.onrender.com
   ```
3. 你的 Webhook 地址是：
   ```
   https://vapi-webhook.onrender.com/webhook
   ```

### 第六步：在 Vapi 配置 Webhook

1. 打开 https://dashboard.vapi.ai
2. 进入你的 Voice Agent 设置
3. 找到 **Server URL** 或 **Webhook URL**
4. 填入：
   ```
   https://vapi-webhook.onrender.com/webhook
   ```
5. 保存设置

---

## 测试

### 方法 1：在线测试

打开浏览器访问：
```
https://vapi-webhook.onrender.com
```

如果看到以下返回，说明服务器运行正常：
```json
{
  "status": "ok",
  "service": "Vapi Webhook Receiver"
}
```

### 方法 2：模拟 Vapi 请求

使用 curl 或 Postman 测试：

```bash
curl -X POST https://vapi-webhook.onrender.com/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "call": {
        "id": "test-123",
        "duration": 120,
        "variableStore": {
          "customer_name": "Maria Gonzalez",
          "phone": "+14155551234",
          "moving_date": "2026-10-15 9:00 AM",
          "loading_address": "123 Main St, San Jose",
          "unloading_address": "456 Oak Ave, Redwood City",
          "property_size": "2-bedroom apartment",
          "special_items": "piano",
          "estimated_hours": "4"
        }
      }
    }
  }'
```

如果收到邮件通知，说明一切正常！

---

## Vapi 提示词模板（西班牙语）

在 Vapi 配置你的 AI 机器人时，使用这个系统提示词：

```
You are a professional moving company receptionist named Ana. 
You speak fluent Spanish and English.

Your job is to collect moving reservation details from callers.
Be friendly, professional, and efficient.

COLLECT THE FOLLOWING INFORMATION:
1. Customer full name (nombre completo)
2. Phone number (número de teléfono)
3. Moving date and preferred time (fecha y hora)
4. Loading address - where we're picking up (dirección de origen)
5. Unloading address - where we're delivering (dirección de destino)
6. Property size - studio, 1-bedroom, 2-bedroom, etc. (tamaño de la propiedad)
7. Any special items like piano, large appliances (artículos especiales)
8. Estimated number of hours if they know (horas estimadas)

RULES:
- If the customer speaks Spanish, respond in Spanish
- If the customer speaks English, respond in English
- If they don't know some details, that's okay - collect what you can
- Be empathetic if they're stressed about moving
- Confirm all details before ending the call
- Tell them they'll receive a confirmation email shortly

After collecting information, summarize everything back to the customer for confirmation.
```

---

## 常见问题

### Q: 邮件没收到？

1. 检查 Render 的 **Logs** 标签页，看是否有错误
2. 确认 `EMAIL_USER` 和 `EMAIL_PASS` 环境变量正确
3. 确认 Gmail 开启了「两步验证」
4. 检查垃圾邮件文件夹

### Q: Vapi 说 Webhook 返回错误？

1. 确认 Webhook URL 正确（注意是 `/webhook` 不是 `/`）
2. 检查 Render 服务是否正在运行（绿色状态）
3. 查看 Render Logs 里的错误信息

### Q: 部署后 URL 打不开？

1. Render 免费档需要等待 30 秒唤醒（首次访问）
2. 检查 Build 是否成功（看 Render Logs）
3. 确认 `package.json` 里有 `"start": "node server.js"`

---

## 文件说明

| 文件 | 作用 |
|------|------|
| `server.js` | Express 服务器，接收 Webhook 并发送邮件 |
| `package.json` | Node.js 依赖配置 |
| `README.md` | 本文档 |

---

## 下一步

部署完成后：
1. 给 Vapi 机器人配置一个测试电话号码
2. 打一通测试电话
3. 检查是否收到邮件通知
4. 根据测试结果调整 Vapi 提示词

有任何问题随时问我！
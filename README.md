# Webhook To Pull

Recevied webhook request then pull repository. For continuous deployment.

For example: your server can pull repository automatically after you push a commit to git server.

Support webhook provider: 

- Github
- Bitbucket
- Gogs
- coding.net
- gitee.com

![](images/flow.svg)

## 📕 How to use

### 0️⃣ 0. Prerequisites

- Git
- Node.js environment

### 1️⃣ 1. Install

``` bash
git clone https://github.com/hangxingliu/webhook-to-pull.git
cd webhook-to-pull
npm install --production
```

### 2️⃣ 2. Configure

``` bash
cp example.config.json config.json
vim config.json # configure your repository and its webhook information
npm start -- test # for test your config is fine 
```

### 3️⃣ 3. Launch

``` bash
# Way1: Keep this program running in the background by pm2
sudo npm install pm2 -g
pm2 start ecosystem.yml

# Way2: just launch
npm start
```

And you can access follwing URL in browser or cURL to make sure this program is running:
`http://127.0.0.1:8080/` (replace `8080` to your port number if you changed in config file)

### 4️⃣ 4. Configure Webhook

#### Github/Gogs

1. Goto **Webhooks** page in your repository's **Settings** page.
2. Click **Add webhook**
3. Setup following configurations and click **Add webhook**
	- **Payload URL**: `http://${YOUR_DOMAIN}:${PORT}/hook`
	- **Content type**: `application/json`
	- **Secret**: The secret you setup in your config file

#### Bitbucket

1. Goto **Webhooks** page in your repository's **Settings** page.
2. Click **Add webhook**
3. Setup following configurations and click **Save** button
	- **Title**: Fill in whatever you like 
	- **URL**: `http://${YOUR_DOMAIN}:${PORT}/hook?secret=${SECRET}`

#### coding.net

1. 前往项目的 **设置** > **WebHook** > **新建 WebHook**
2. 填写下列信息后点击 **新建 WebHook**
	- **URL**: `http://${你的域名或IP}:${端口号}/hook`
	- **内容类型**: `application/json`
	- **令牌**: 你在配置文件中设置的 `secret` 值

#### gitee.com

1. 前往项目的 **管理** > **WebHook** > **添加**
2. 填写下列信息后点击 **提交**
	- **URL**: `http://${你的域名或IP}:${端口号}/hook`
	- **密码**: 你在配置文件中设置的 `secret` 值

## 👨🏼‍💻 Author

[LiuYue (@hangxingliu)](https://github.com/hangxingliu)

## 📢 License

[GPL-3.0](LICENSE)

# Autobot

Facebook Messenger Bot with Web Interface

## Deploy to Render.com

1. **Push to GitHub** - Make sure `node_modules` and `package-lock.json` are NOT uploaded (added to .gitignore)

2. **Create Render.com Account** - Go to https://render.com and sign up

3. **Create New Web Service**
   - Connect your GitHub repository
   - Select the `autobot` folder/repository
   - Build Command: `npm install`
   - Start Command: `npm start`

4. **Environment Variables** - None required

5. **Deploy** - Click Deploy

## Local Development

```bash
cd autobot
npm install
npm start
```

Open http://localhost:3000

## Features

- Web Interface for login
- Multi-account support
- Custom commands
- Permission system

## Commands

- /ping - Check response time
- /help - Show commands
- /info - Bot info
- /echo <text> - Echo message
- /ai <message> - Chat with AI
- /tiktok <search> - Search TikTok

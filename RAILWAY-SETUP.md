# 🚂 Railway Deployment Guide

## Step 1: Push to GitHub
Make sure your code is pushed to GitHub:
```bash
git add .
git commit -m "Add Railway deployment with AUTO-main structure"
git push origin main
```

## Step 2: Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Login with your GitHub account
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your autobot repository

## Step 3: Configure Environment Variables
In Railway dashboard, go to "Variables" tab and add:

| Variable | Value |
|----------|-------|
| `PORT` | `3000` |
| `JSONBIN_ID` | Your JSONBin.io ID (get from jsonbin.io) |
| `JSONBIN_KEY` | Your JSONBin.io API Key |

### Getting JSONBin.io credentials:
1. Go to [jsonbin.io](https://jsonbin.io)
2. Create account / Login
3. Create a new bin (collection)
4. Copy the Bin ID from URL (e.g., `https://jsonbin.io/YOUR_BIN_ID`)
5. Create API Key in settings

## Step 4: Deploy
1. Click "Deploy" in Railway dashboard
2. Wait for build to complete
3. Click the generated URL to access your bot

## Step 5: Login to Your Bot
1. Open the Railway URL in your browser
2. Enter your Facebook appstate
3. Set your prefix and admin
4. Click Login

## Available Commands
Your bot now has AUTO-main style commands:

### Regular Commands:
- `help` - Command list and usage
- `ai` - AI chatbot (GPT)
- `trans` - Translate text
- `music` - YouTube music search
- `anime` - Random anime images
- `pinterest` - Pinterest image search
- `dictionary` - Word definition
- `emojimix` - Mix two emojis
- `teach` - Teach the bot

### Event Commands:
- `antiout` - Auto re-add users who leave
- `resend` - Show unsent messages
- `soyeon` - AI chat mode

## Troubleshooting

### Build Failed
- Check the build logs in Railway dashboard
- Make sure package.json has correct dependencies

### Bot Not Responding
- Check runtime logs in Railway dashboard
- Verify JSONBin.io credentials are correct

### Need to Update Code
1. Push changes to GitHub
2. Railway will auto-deploy on push
3. Or manually trigger deploy in Railway dashboard

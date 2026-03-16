# Autobot

A Facebook Messenger Bot with Web Interface using @dongdev/fca-unofficial.

## Features

- 🌐 Web Interface for easy login
- 👥 Multi-account support
- 📝 Custom commands system
- 🔒 Permission levels (admin, thread admin, user)
- ⏱️ Cooldown system
- 🎮 Various built-in commands

## Installation

```bash
cd autobot
npm install
```

## Setup

1. **Start the bot:**
```bash
npm start
```

2. **Open web interface:**
```
http://localhost:3000
```

3. **Get Appstate:**
   - Use Kiwi Browser with C3C fbstate extension
   - Or use a Facebook cookie extractor
   - Paste the appstate in the web interface

4. **Configure:**
   - Select commands to enable
   - Set prefix (default: /)
   - Add admin UID (optional)
   - Accept terms and submit

## Commands

- `/ping` - Check bot response time
- `/help` - Show all available commands
- `/info` - Get bot information
- `/echo <text>` - Echo back your message
- `/ai <message>` - Chat with SimSimi AI
- `/tiktok <search>` - Search TikTok videos

## Adding Commands

Create a new file in `cmd/` folder:

```js
module.exports.config = {
  name: "commandname",
  version: "1.0.0",
  hasPermssion: 0, // 0 = everyone, 1 = admin, 2 = thread admin
  credits: "Your Name",
  description: "Command description",
  commandCategory: "category",
  usages: "<args>",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  api.sendMessage("Hello!", threadID, messageID);
};
```

## Project Structure

```
autobot/
├── index.js          # Main bot file
├── package.json      # Dependencies
├── public/           # Web interface
│   ├── index.html
│   ├── guide.html
│   ├── online.html
│   ├── script.js
│   └── styles.css
├── cmd/              # Commands
│   ├── ping.js
│   ├── help.js
│   ├── info.js
│   ├── echo.js
│   ├── ai.js
│   └── tiktok.js
└── README.md
```

## Web Interface

- **Home** (`/`) - Login with appstate
- **Guide** (`/guide`) - Step-by-step setup guide
- **Active** (`/active`) - View active bot accounts

## Requirements

- Node.js 18+
- Facebook account (appstate)

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const TIKTOK_SEARCH_API = 'https://lyric-search-neon.vercel.app/kshitiz?keyword=';
const CACHE_DIR = path.join(__dirname, 'cache');

module.exports.config = {
  name: "tiktok",
  aliases: ["tt"],
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Neoaz ゐ",
  description: "Search and download TikTok video",
  commandCategory: "media",
  usages: "<search>",
  cooldowns: 5,
  role: 0
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const query = args.join(" ");

  if (!query) {
    api.sendMessage("📌 Usage: tiktok <search query>", threadID, messageID);
    return;
  }

  try {
    api.sendMessage("🔎 Searching TikTok for: " + query, threadID, messageID);

    const searchResponse = await axios.get(TIKTOK_SEARCH_API + encodeURIComponent(query), { timeout: 20000 });
    const results = searchResponse.data.slice(0, 6);

    if (!results || results.length === 0) {
      return api.sendMessage("❌ No TikTok videos found for the query.", threadID, messageID);
    }

    let messageBody = "Found " + results.length + " videos.\n\n";

    results.forEach((video, index) => {
      const title = video.title ? video.title.substring(0, 50) : 'Untitled';
      messageBody += `${index + 1}. ${title}...\n`;
      messageBody += `   • Creator: @${video.author?.unique_id || 'unknown'}\n`;
      messageBody += `   • Duration: ${video.duration || 0}s\n\n`;
    });

    messageBody += "Reply with the number (1-" + results.length + ") to download the video.";

    api.sendMessage(messageBody, threadID, (err, info) => {
      if (!err) {
        // Store the results for reply handling
        global.tiktokSearchResults = global.tiktokSearchResults || {};
        global.tiktokSearchResults[info.messageID] = {
          results: results,
          author: event.senderID
        };
      }
    }, messageID);

  } catch (error) {
    console.error("TikTok Search Error:", error.message);
    api.sendMessage("❌ Failed to search TikTok. Please try again.", threadID, messageID);
  }
};

// Handle reply
module.exports.handleReply = async function({ api, event, handleReply }) {
  const { threadID, messageID, body } = event;
  const selection = parseInt(body);

  const results = handleReply.results;

  if (isNaN(selection) || selection < 1 || selection > results.length) {
    return api.sendMessage("❌ Invalid selection. Choose 1-" + results.length + ".", threadID, messageID);
  }

  const selectedVideo = results[selection - 1];
  
  try {
    api.sendMessage("⏳ Downloading: " + (selectedVideo.title || 'video').substring(0, 30) + "...", threadID, messageID);

    await fs.ensureDir(CACHE_DIR);

    const safeTitle = (selectedVideo.title || 'tiktok').substring(0, 30).replace(/[^a-z0-9]/gi, '_');
    const filename = `${Date.now()}_${safeTitle}.mp4`;
    const filePath = path.join(CACHE_DIR, filename);

    const writer = fs.createWriteStream(filePath);
    const response = await axios({
      url: selectedVideo.videoUrl,
      method: 'GET',
      responseType: 'stream',
      timeout: 300000
    });

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const authorName = selectedVideo.author?.unique_id || 'unknown';
    const duration = selectedVideo.duration || 0;

    api.sendMessage(
      { 
        body: `✅ Downloaded!\nTitle: ${selectedVideo.title || 'Untitled'}\nCreator: @${authorName}\nDuration: ${duration}s`,
        attachment: fs.createReadStream(filePath)
      },
      threadID,
      (err) => {
        fs.unlink(filePath).catch(console.error);
      },
      messageID
    );

  } catch (error) {
    console.error("TikTok Download Error:", error.message);
    api.sendMessage("❌ Failed to download the video.", threadID, messageID);
  }
};

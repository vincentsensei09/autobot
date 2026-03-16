const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const CACHE_DIR = path.join(__dirname, 'cache');

// Use a different TikTok scraping API
const TIKTOK_API = 'https://www.tikwm.com/api/';

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

module.exports.run = async function({ api, event, args, Utils }) {
  const { threadID, messageID, senderID } = event;
  const query = args.join(" ");

  if (!query) {
    api.sendMessage("📌 Usage: tiktok <search query>", threadID, messageID);
    return;
  }

  try {
    api.sendMessage("🔎 Searching TikTok for: " + query, threadID, messageID);

    // Use TikWM API for searching
    const searchUrl = `${TIKTOK_API}feed/list?keyword=${encodeURIComponent(query)}&count=6&page=0`;
    const response = await axios.get(searchUrl, { 
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = response.data;
    if (!data.data || data.data.length === 0) {
      return api.sendMessage("❌ No TikTok videos found for the query.", threadID, messageID);
    }

    const results = data.data;

    let messageBody = `Found ${results.length} videos.\n\n`;

    results.forEach((video, index) => {
      const title = video.desc ? video.desc.substring(0, 50) : 'Untitled';
      const author = video.author?.unique_id || 'unknown';
      const duration = video.duration || 0;
      messageBody += `${index + 1}. ${title}...\n`;
      messageBody += `   • Creator: @${author}\n`;
      messageBody += `   • Duration: ${Math.floor(duration/60)}:${(duration%60).toString().padStart(2,'0')}\n\n`;
    });

    messageBody += "Reply with the number (1-" + results.length + ") to download the video.";

    api.sendMessage(messageBody, threadID, (err, info) => {
      if (!err && info.messageID) {
        // Store the reply data for handleReply
        if (!Utils.replyData) Utils.replyData = new Map();
        Utils.replyData.set(info.messageID, {
          results: results,
          userId: senderID,
          command: 'tiktok'
        });
      }
    }, messageID);

  } catch (error) {
    console.error("TikTok Search Error:", error.message);
    api.sendMessage("❌ Failed to search TikTok. Please try again.", threadID, messageID);
  }
};

// Handle reply
module.exports.handleReply = async function({ api, event, Utils }) {
  const { threadID, messageID, senderID, messageReply } = event;
  
  if (!messageReply) return;
  
  const replyMsgId = messageReply.messageID;
  const selection = parseInt(event.body);

  if (!Utils.replyData || !Utils.replyData.has(replyMsgId)) {
    return api.sendMessage("❌ No search results found. Please search again.", threadID, messageID);
  }

  const stored = Utils.replyData.get(replyMsgId);
  
  // Verify it's the same user
  if (stored.userId !== senderID) {
    return api.sendMessage("❌ You can only download from your own search.", threadID, messageID);
  }

  const results = stored.results;

  if (isNaN(selection) || selection < 1 || selection > results.length) {
    return api.sendMessage("❌ Invalid selection. Choose 1-" + results.length + ".", threadID, messageID);
  }

  const selectedVideo = results[selection - 1];
  
  try {
    const title = selectedVideo.desc || 'tiktok video';
    api.sendMessage("⏳ Downloading: " + title.substring(0, 30) + "...", threadID, messageID);

    await fs.ensureDir(CACHE_DIR);

    const safeTitle = title.substring(0, 30).replace(/[^a-z0-9]/gi, '_');
    const filename = `${Date.now()}_${safeTitle}.mp4`;
    const filePath = path.join(CACHE_DIR, filename);

    // Get the video URL (prefer HD)
    let videoUrl = selectedVideo.video_data?.playAddr || selectedVideo.video?.downloadAddr;
    if (Array.isArray(videoUrl)) {
      videoUrl = videoUrl[0];
    }
    
    if (!videoUrl) {
      // Try alternative format
      videoUrl = selectedVideo.video?.playAddr || selectedVideo.download_addr;
    }

    if (!videoUrl) {
      return api.sendMessage("❌ Cannot get video URL. The video might not be available for download.", threadID, messageID);
    }

    // Download the video
    const response = await axios({
      url: videoUrl,
      method: 'GET',
      responseType: 'stream',
      timeout: 300000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const authorName = selectedVideo.author?.unique_id || 'unknown';
    const duration = selectedVideo.duration || 0;
    const minutes = Math.floor(duration / 60);
    const seconds = (duration % 60).toString().padStart(2, '0');

    // Send the video
    api.sendMessage(
      { 
        body: `✅ Downloaded!\n\nTitle: ${title}\nCreator: @${authorName}\nDuration: ${minutes}:${seconds}`,
        attachment: fs.createReadStream(filePath)
      },
      threadID,
      (err) => {
        // Clean up the file after sending
        fs.unlink(filePath).catch(console.error);
        
        if (err) {
          console.error("Send video error:", err);
          api.sendMessage("❌ Failed to send the video file.", threadID, messageID);
        }
      },
      messageID
    );

  } catch (error) {
    console.error("TikTok Download Error:", error.message);
    api.sendMessage("❌ Failed to download the video: " + error.message, threadID, messageID);
  }
};

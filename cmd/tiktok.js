const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const CACHE_DIR = path.join(__dirname, 'cache');

module.exports.config = {
  name: "tiktok",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "Kim Joseph DG Bien - REMAKE BY JONELL",
  description: "Download TikTok video from URL",
  commandCategory: "media",
  usages: "<tiktok_url>",
  cooldowns: 5,
  role: 0
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const tiktokUrl = args.join(" ");

  if (!tiktokUrl) {
    api.sendMessage("Usage: tiktok <tiktok_url>\n\nExample: tiktok https://www.tiktok.com/@user/video/123456789", threadID, messageID);
    return;
  }

  // Validate TikTok URL
  if (!tiktokUrl.includes('tiktok.com')) {
    api.sendMessage("Please provide a valid TikTok URL!\n\nExample: tiktok https://www.tiktok.com/@user/video/123456789", threadID, messageID);
    return;
  }

  // Ensure cache directory exists
  await fs.ensureDir(CACHE_DIR);

  let tempFilePath;

  try {
    const loadingMsg = await api.sendMessage("⏳ Downloading TikTok video...", threadID, messageID);

    // Try different TikTok APIs
    let videoUrl = null;
    let videoData = {};

    // API 1: ryzen-api
    try {
      const response = await axios.get(`https://api.ryzendesu.vip/api/tools/tiktok?url=${encodeURIComponent(tiktokUrl)}`, {
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (response.data?.data?.video?.play) {
        videoUrl = response.data.data.video.play;
        videoData = response.data.data;
      }
    } catch (e) {
      console.log('API 1 failed:', e.message);
    }

    // API 2: tiklydown
    if (!videoUrl) {
      try {
        const response = await axios.get(`https://api.tiklydown.me/v2/download?url=${encodeURIComponent(tiktokUrl)}`, {
          timeout: 20000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (response.data?.video?.downloadUrl) {
          videoUrl = response.data.video.downloadUrl;
          videoData = response.data;
        }
      } catch (e) {
        console.log('API 2 failed:', e.message);
      }
    }

    if (!videoUrl) {
      await api.unsendMessage(loadingMsg.messageID);
      api.sendMessage("❌ Could not download video. The video might be private or unavailable.", threadID, messageID);
      return;
    }

    // Get video info
    const author = videoData?.author?.nickname || videoData?.video?.author?.name || 'Unknown';
    const title = videoData?.title || videoData?.video?.title || 'TikTok Video';

    // Download video
    const filePath = path.join(CACHE_DIR, `tiktok_${Date.now()}.mp4`);
    tempFilePath = filePath;

    const videoResponse = await axios({
      method: 'get',
      url: videoUrl,
      responseType: 'stream',
      timeout: 120000
    });

    const writer = fs.createWriteStream(filePath);
    videoResponse.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Check file size
    const fileSize = fs.statSync(filePath).size;
    const maxSize = 16 * 1024 * 1024; // 16MB

    if (fileSize > maxSize) {
      fs.unlink(filePath).catch(() => {});
      api.sendMessage(
        `✅ TikTok Video!\n👤 Author: ${author}\n📝 Title: ${title}\n\n⚠️ Video too large (${(fileSize/1024/1024).toFixed(2)}MB). Max 16MB.\n\n🔗 Download: ${videoUrl}`,
        threadID,
        messageID
      );
      return;
    }

    await api.unsendMessage(loadingMsg.messageID);

    // Send video with callback
    api.sendMessage(
      { body: `✅ TikTok Video!\n👤 Author: ${author}\n📝 Title: ${title}`, attachment: fs.createReadStream(filePath) },
      threadID,
      (err) => {
        if (tempFilePath) fs.unlink(tempFilePath).catch(() => {});
        if (err) {
          console.error("Send error:", err);
          api.sendMessage(`✅ TikTok Video!\n👤 Author: ${author}\n📝 Title: ${title}\n\n🔗 Download: ${videoUrl}`, threadID, messageID);
        }
      }
    );

  } catch (error) {
    console.error("TikTok Error:", error.message);
    if (tempFilePath) fs.unlink(tempFilePath).catch(() => {});
    api.sendMessage("Error: " + error.message, threadID, messageID);
  }
};

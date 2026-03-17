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

  try {
    const loadingMsg = await api.sendMessage("⏳ Downloading TikTok video...", threadID, messageID);

    // Using free TikTok API
    const apiUrls = [
      `https://api.ryzendesu.vip/api/tools/tiktok?url=${encodeURIComponent(tiktokUrl)}`,
      `https://api.tiklydown.me/v2/download?url=${encodeURIComponent(tiktokUrl)}`,
      `https://ssstik.io/ajax?url=${encodeURIComponent(tiktokUrl)}`
    ];

    let videoData = null;
    let videoUrl = null;

    for (const apiUrl of apiUrls) {
      try {
        const response = await axios.get(apiUrl, { 
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        // Try different API response formats
        if (response.data?.data?.video) {
          videoUrl = response.data.data.video.play || response.data.data.video.url;
          videoData = response.data.data;
          break;
        } else if (response.data?.video) {
          videoUrl = response.data.video;
          videoData = response.data;
          break;
        } else if (response.data?.tiktok) {
          videoUrl = response.data.tiktok.video || response.data.tiktok.play;
          videoData = response.data.tiktok;
          break;
        }
      } catch (e) {
        console.log(`TikTok API ${apiUrl} failed: ${e.message}`);
        continue;
      }
    }

    if (!videoUrl) {
      // Fallback: try to get from SSSTik
      try {
        const ssResponse = await axios.get(`https://ssstik.io/ajax?url=${encodeURIComponent(tiktokUrl)}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        if (ssResponse.data?.html) {
          const match = ssResponse.data.html.match(/href="(https:\/\/[^"]+)"/);
          if (match) {
            videoUrl = match[1];
            videoData = { title: 'TikTok Video' };
          }
        }
      } catch (e) {
        console.log('SSSTik fallback failed:', e.message);
      }
    }

    if (!videoUrl) {
      api.sendMessage(
        "❌ Could not download TikTok video.\nThe video might be private or unavailable.",
        threadID,
        messageID
      );
      return;
    }

    // Get video info
    const author = videoData?.author?.nickname || videoData?.author?.unique_id || 'Unknown';
    const title = videoData?.title || 'TikTok Video';

    const message = `✅ TikTok Video Downloaded!\n\n👤 Author: ${author}\n📝 Title: ${title}`;

    await api.unsendMessage(loadingMsg.messageID);

    // Ensure cache directory exists
    await fs.ensureDir(CACHE_DIR);

    const filePath = path.join(CACHE_DIR, `tiktok_video_${Date.now()}.mp4`);
    const writer = fs.createWriteStream(filePath);

    const videoResponse = await axios({
      method: 'get',
      url: videoUrl,
      responseType: 'stream',
      timeout: 120000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    videoResponse.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Check file size (limit to 16MB for Facebook)
    const fileSize = fs.statSync(filePath).size;
    const maxSize = 16 * 1024 * 1024; // 16MB

    if (fileSize > maxSize) {
      fs.unlink(filePath).catch(console.error);
      api.sendMessage(
        `✅ TikTok Video!\n\n👤 Author: ${author}\n📝 Title: ${title}\n\n⚠️ Video too large to send (${(fileSize/1024/1024).toFixed(2)}MB). Max is 16MB.\n\n📥 Download link: ${videoUrl}`,
        threadID,
        messageID
      );
      return;
    }

    api.sendMessage(
      { body: message, attachment: fs.createReadStream(filePath) },
      threadID,
      (err) => {
        fs.unlink(filePath).catch(console.error);
        
        if (err) {
          console.error("Send video error:", err);
          api.sendMessage(
            `✅ TikTok Video!\n\n👤 Author: ${author}\n📝 Title: ${title}\n\n⚠️ Could not send video file.\n\n📥 Download: ${videoUrl}`,
            threadID,
            messageID
          );
        }
      },
      messageID
    );

  } catch (error) {
    console.error("TikTok Error:", error.message);
    api.sendMessage("Error: " + error.message, threadID, messageID);
  }
};

const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports.config = {
  name: "tiktok",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "",
  description: "Search TikTok videos",
  commandCategory: "media",
  usages: "<search>",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  
  if (!args.length) {
    api.sendMessage("📌 Usage: tiktok <search>", threadID, messageID);
    return;
  }
  
  const searchQuery = args.join(" ");
  
  try {
    api.sendMessage("🔍 Searching...", threadID, messageID);
    
    const response = await axios.get(`https://api.tiklydown.eu.org/api/search/${encodeURIComponent(searchQuery)}`);
    const videos = response.data.videos;
    
    if (!videos || videos.length === 0) {
      api.sendMessage("No videos found.", threadID, messageID);
      return;
    }
    
    const video = videos[0];
    const videoUrl = video.video.downloadAddr;
    
    const message = `🎵 ${video.title}\n👤 ${video.author.nickname}`;
    
    // Download and send video
    const cacheDir = path.join(__dirname, '../cmd/cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
    
    const filePath = path.join(cacheDir, 'tiktok.mp4');
    
    const videoResponse = await axios({
      method: 'get',
      url: videoUrl,
      responseType: 'stream'
    });
    
    const writer = fs.createWriteStream(filePath);
    videoResponse.data.pipe(writer);
    
    writer.on('finish', () => {
      api.sendMessage({ body: message, attachment: fs.createReadStream(filePath) }, threadID, () => {
        fs.unlinkSync(filePath);
      });
    });
  } catch (error) {
    console.error("TikTok Error:", error.message);
    api.sendMessage("Error searching TikTok.", threadID, messageID);
  }
};

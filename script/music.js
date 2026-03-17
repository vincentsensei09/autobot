const path = require('path');
const fs = require('fs-extra');

const CACHE_DIR = path.join(__dirname, 'cache');

module.exports.config = {
  name: "music",
  version: "1.0.0",
  role: 0,
  hasPrefix: true,
  aliases: ['play'],
  usage: 'music [song name]',
  description: 'Search and download music from YouTube',
  credits: 'Developer',
  cooldown: 5
};

module.exports.run = async function({ api, event, args }) {
  const musicName = args.join(' ');
  
  // Ensure cache directory exists
  await fs.ensureDir(CACHE_DIR);
  
  if (!musicName) {
    api.sendMessage(`Usage: music [song name]\n\nExample: music despacito`, event.threadID, event.messageID);
    return;
  }

  try {
    const ytdl = require('ytdl-core');
    const yts = require('yt-search');
    
    await api.sendMessage(`🔍 Searching for "${musicName}"...`, event.threadID, event.messageID);
    
    const searchResults = await yts(musicName);
    if (!searchResults.videos.length) {
      return api.sendMessage("No results found.", event.threadID, event.messageID);
    }

    const music = searchResults.videos[0];
    const musicUrl = music.url;
    
    const timestamp = Date.now();
    const filePath = path.join(CACHE_DIR, `music_${timestamp}.mp3`);
    
    // Download audio
    const stream = ytdl(musicUrl, {
      filter: "audioonly",
      quality: "highestaudio"
    });

    const writer = fs.createWriteStream(filePath);
    stream.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Check file size
    const fileSize = fs.statSync(filePath).size;
    const maxSize = 25 * 1024 * 1024; // 25MB

    if (fileSize > maxSize) {
      fs.unlink(filePath).catch(() => {});
      return api.sendMessage('File too large (>25MB). Cannot send.', event.threadID, event.messageID);
    }

    // Send the music file
    api.sendMessage(
      { body: `🎵 ${music.title}\n⏱ ${music.duration}`, attachment: fs.createReadStream(filePath) },
      event.threadID,
      (err) => {
        fs.unlink(filePath).catch(() => {});
        if (err) {
          console.log('Send error:', err);
          api.sendMessage(`🎵 ${music.title}\n⏱ ${music.duration}\n\n🔗 ${musicUrl}`, event.threadID, event.messageID);
        }
      },
      event.messageID
    );

  } catch (error) {
    console.log('Music error:', error.message);
    api.sendMessage('Error: ' + error.message, event.threadID, event.messageID);
  }
};

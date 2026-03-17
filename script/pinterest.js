const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const CACHE_DIR = path.join(__dirname, 'cache');

module.exports.config = {
  name: "pinterest",
  version: "1.0.0",
  role: 0,
  hasPrefix: true,
  description: "Search for images on Pinterest.",
  usages: "pinterest [query] - [amount]",
  credits: "Developer",
};

async function getPinterest(img) {
  try {
    const { data } = await axios.get("https://id.pinterest.com/search/pins/?autologin=true&q=" + img, {
      headers: {
        cookie: "_auth=1; _b=\"AVna7S1p7l1C5I9u0+nR3YzijpvXOPc6d09SyCzO+DcwpersQH36SmGiYfymBKhZcGg=\"; _pinterest_sess=TWc9PSZHamJOZ0JobUFiSEpSN3Z4a2NsMk9wZ3gxL1NSc2k2NkFLaUw5bVY5cXR5alZHR0gxY2h2MVZDZlNQalNpUUJFRVR5L3NlYy9JZkthekp3bHo5bXFuaFZzVHJFMnkrR3lTbm56U3YvQXBBTW96VUgzVUhuK1Z4VURGKzczUi9hNHdDeTJ5Y2pBTmxhc2owZ2hkSGlDemtUSnYvVXh5dDNkaDN3TjZCTk8ycTdHRHVsOFg2b2NQWCtpOWxqeDNjNkk3cS85MkhhSklSb0hwTnZvZVFyZmJEUllwbG9UVnpCYVNTRzZxOXNJcmduOVc4aURtM3NtRFo3STlmWjJvSjlWTU5ITzg0VUg1NGhOTEZzME9SNFNhVWJRWjRJK3pGMFA4Q3UvcHBnWHdaYXZpa2FUNkx6Z3RNQjEzTFJEOHZoaHRvazc1c1UrYlRuUmdKcDg3ZEY4cjNtZlBLRTRBZjNYK0lPTXZJTzQ5dU8ybDdVS015bWJKT0tjTWYyRlBzclpiamdsNmtpeUZnRjlwVGJXUmdOMXdTUkFHRWloVjBMR0JlTE5YcmhxVHdoNzFHbDZ0YmFHZ1VLQXU1QnpkM1FqUTNMTnhYb3VKeDVGbnhNSkdkNXFSMXQybjRGL3pyZXRLR0ZTc0xHZ0JvbTJCNnAzQzE0cW1WTndIK0trY05HV1gxS09NRktadnFCSDR2YzBoWmRiUGZiWXFQNjcwWmZhaDZQRm1UbzNxc21pV1p5WDlabm1UWGQzanc1SGlrZXB1bDVDWXQvUis3elN2SVFDbm1DSVE5Z0d4YW1sa2hsSkZJb1h0MTFpck5BdDR0d0lZOW1Pa2RDVzNySWpXWmUwOUFhQmFSVUpaOFQ3WlhOQldNMkExeDIvMjZHeXdnNjdMYWdiQUhUSEFBUlhUVTdBMThRRmh1ekJMYWZ2YTJkNlg0cmFCdnU2WEpwcXlPOVZYcGNhNkZDd051S3lGZmo0eHV0ZE42NW8xRm5aRWpoQnNKNnNlSGFad1MzOHNkdWtER0xQTFN5Z3lmRERsZnZWWE5CZEJneVRlMDd2VmNPMjloK0g5eCswZUVJTS9CRkFweHc5RUh6K1JocGN6clc1JmZtL3JhRE1sc0NMTFlpMVErRGtPcllvTGdldz0="
      },
    });
    const $ = cheerio.load(data);
    const result = [];
    const image = [];
    $("div > a").each((_, element) => {
      const link = $(element).find("img").attr("src");
      if (link !== undefined) result.push(link);
    });
    for (let v of result) {
      image.push(v.replace(/236/g, "736"));
    }
    image.shift();
    return image;
  } catch (error) {
    throw error;
  }
}

module.exports.run = async function({ api, event, args, prefix }) {
  const input = args.join(' ');
  
  // Ensure cache directory exists
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  
  if (!input) {
    api.sendMessage(`Usage: ${prefix}pinterest [query] - [amount]\n\nExample: ${prefix}pinterest cat - 5`, event.threadID, event.messageID);
    return;
  }

  try {
    const key = input.substr(0, input.indexOf('-')).trim() || input;
    const len = parseInt(input.split("-").pop()) || 5;
    
    await api.sendMessage(`🔍 Searching for "${key}"...`, event.threadID, event.messageID);
    
    const data = await getPinterest(key);
    if (!data || data.length === 0) {
      return api.sendMessage("No images found.", event.threadID, event.messageID);
    }

    const timestamp = Date.now();
    const filePaths = [];
    
    for (let i = 0; i < Math.min(len, data.length); i++) {
      try {
        const filePath = path.join(CACHE_DIR, `${timestamp}_${i + 1}.jpg`);
        const download = (await axios.get(data[i], { responseType: 'arraybuffer' })).data;
        fs.writeFileSync(filePath, Buffer.from(download));
        filePaths.push(filePath);
      } catch (e) {
        console.log('Download error:', e.message);
      }
    }

    if (filePaths.length === 0) {
      return api.sendMessage("Failed to download images.", event.threadID, event.messageID);
    }

    const attachments = filePaths.map(p => fs.createReadStream(p));
    
    api.sendMessage({
      attachment: attachments,
      body: `Found ${filePaths.length} images for "${key}"`
    }, event.threadID, (err) => {
      // Clean up files
      filePaths.forEach(p => {
        try { fs.unlinkSync(p); } catch(e) {}
      });
      if (err) {
        console.log('Send error:', err);
      }
    }, event.messageID);

  } catch (error) {
    console.log(error);
    api.sendMessage("Error: " + error.message, event.threadID, event.messageID);
  }
};

const axios = require('axios');

module.exports.config = {
  name: "ai",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "",
  description: "Chat with SimSimi AI",
  commandCategory: "ai",
  usages: "<message>",
  cooldowns: 3
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, body } = event;
  
  if (!args.length) {
    api.sendMessage("📌 Usage: ai <message>", threadID, messageID);
    return;
  }
  
  const query = args.join(" ");
  
  try {
    const apiKey = "2a5a2264d2ee4f0b847cb8bd809ed34bc3309be7";
    const response = await axios.get(`https://simsimi.ooguy.com/sim?query=${encodeURIComponent(query)}&apikey=${apiKey}`);
    
    if (response.data && response.data.respond) {
      api.sendMessage(response.data.respond, threadID, messageID);
    } else {
      api.sendMessage("I don't understand that.", threadID, messageID);
    }
  } catch (error) {
    console.error("AI Error:", error.message);
    api.sendMessage("Sorry, I encountered an error.", threadID, messageID);
  }
};

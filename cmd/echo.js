module.exports.config = {
  name: "echo",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "",
  description: "Echo back your message",
  commandCategory: "utility",
  usages: "<text>",
  cooldowns: 3
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  
  const text = args.join(" ");
  if (!text) {
    api.sendMessage("Please provide text to echo.", threadID, messageID);
    return;
  }
  
  api.sendMessage(text, threadID, messageID);
};

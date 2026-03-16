module.exports.config = {
  name: "info",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "",
  description: "Get bot information",
  commandCategory: "utility",
  usages: "",
  cooldowns: 3
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  
  const botID = api.getCurrentUserID();
  
  const message = `🤖 Bot Information\n\n` +
    `Bot ID: ${botID}\n` +
    `Status: Online\n` +
    `Library: @dongdev/fca-unofficial\n` +
    `Version: 1.0.0`;
  
  api.sendMessage(message, threadID, messageID);
};

module.exports.config = {
  name: "ping",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "",
  description: "Check bot response time",
  commandCategory: "utility",
  usages: "",
  cooldowns: 3
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const start = Date.now();
  
  api.sendMessage("🏓 Pinging...", threadID, async (err, info) => {
    if (!err) {
      const ping = Date.now() - start;
      api.editMessage(`🏓 Pong! Response time: ${ping}ms`, info.messageID);
    }
  }, messageID);
};

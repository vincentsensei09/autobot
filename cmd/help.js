module.exports.config = {
  name: "help",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "",
  description: "Show all available commands",
  commandCategory: "utility",
  usages: "",
  cooldowns: 3
};

module.exports.run = async function({ api, event, args, Utils }) {
  const { threadID, messageID } = event;
  
  let message = "📋 Available Commands:\n\n";
  
  for (const [aliases, cmd] of Utils.commands) {
    const name = cmd.name;
    const desc = cmd.description || "";
    message += `• ${name} - ${desc}\n`;
  }
  
  message += "\nUse <prefix>help <command> for more info";
  
  api.sendMessage(message, threadID, messageID);
};

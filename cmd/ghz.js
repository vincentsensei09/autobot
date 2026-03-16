const WebSocket = require("ws");

const activeSessions = new Map();
const lastSentCache = new Map();
const favoriteMap = new Map();
const previousStockCache = new Map();

// Special items that will trigger notification
const specialNotifyItems = [
	"cherry", "bamboo", "mango", "wheat", "cabbage", 
	"super sprinkler", "turbo sprinkler", "watermelon", "pineapple"
];

let sharedWebSocket = null;
let keepAliveInterval = null;

function formatValue(val) {
	if (val >= 1_000_000) return `×${(val / 1_000_000).toFixed(1)}M`;
	if (val >= 1_000) return `×${(val / 1_000).toFixed(1)}K`;
	return `×${val}`;
}

function getPHTime() {
	return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
}

function cleanText(text) {
	return text ? text.trim().toLowerCase() : "";
}

function formatItems(items) {
	if (!Array.isArray(items)) return "";
	return items
		.filter(i => i && i.quantity > 0)
		.map(i => `│  ${i.emoji ? i.emoji + " " : ""}${i.name || "Unknown"}: ${formatValue(i.quantity)}`)
		.join("\n");
}

function getStockKey(seeds, gear) {
	const allItems = [...seeds, ...gear].filter(i => i && i.quantity > 0);
	return JSON.stringify(allItems.map(i => ({ name: cleanText(i.name), quantity: i.quantity })).sort((a, b) => a.name.localeCompare(b.name)));
}

function findNewItems(currentSeeds, currentGear, previousSeeds, previousGear) {
	const previousItems = new Map();

	if (Array.isArray(previousSeeds)) {
		for (const item of previousSeeds) {
			if (item && item.name) {
				previousItems.set(cleanText(item.name), item);
			}
		}
	}
	if (Array.isArray(previousGear)) {
		for (const item of previousGear) {
			if (item && item.name) {
				previousItems.set(cleanText(item.name), item);
			}
		}
	}

	const newItems = [];
	const allCurrent = [...(currentSeeds || []), ...(currentGear || [])];

	for (const item of allCurrent) {
		if (item && item.quantity > 0 && item.name) {
			const itemName = cleanText(item.name);
			const prevItem = previousItems.get(itemName);
			if (!prevItem || prevItem.quantity < item.quantity) {
				newItems.push(item);
			}
		}
	}

	return newItems;
}

async function sendMentionMessage(api, threadId, content, participantIDs) {
	if (!content || participantIDs.length === 0) return;

	let body = `@everyone\n\n${content}`;
	let mentions = participantIDs.map(id => ({
		tag: "@everyone",
		id: id,
		fromIndex: 0
	}));

	await api.sendMessage({ body, mentions }, threadId);
}

function ensureWebSocketConnection() {
	if (sharedWebSocket && sharedWebSocket.readyState === WebSocket.OPEN) return;
	sharedWebSocket = new WebSocket("wss://ghz.indevs.in/ghz");

	sharedWebSocket.on("open", () => {
		console.log("[GHZ] WebSocket connected");
		keepAliveInterval = setInterval(() => {
			if (sharedWebSocket && sharedWebSocket.readyState === WebSocket.OPEN) {
				sharedWebSocket.send("ping");
			}
		}, 10000);
	});

	sharedWebSocket.on("message", async (data) => {
		try {
			const payload = JSON.parse(data.toString());
			if (!payload) return;

			const seeds = Array.isArray(payload.seeds) ? payload.seeds : [];
			const gear = Array.isArray(payload.gear) ? payload.gear : [];
			const weather = payload.weather || null;

			for (const [threadId, session] of activeSessions.entries()) {
				const favList = favoriteMap.get(threadId) || [];
				let sections = [];
				let matchCount = 0;

				function checkItems(label, items) {
					const available = items.filter(i => i && i.quantity > 0);
					if (available.length === 0) return false;

					const matched = favList.length > 0
						? available.filter(i => favList.includes(cleanText(i.name)))
						: available;

					if (favList.length > 0 && matched.length === 0) return false;

					matchCount += matched.length;
					sections.push(`${label}\n${formatItems(matched)}`);
					return true;
				}

				checkItems("🌱  SEEDS  🧱", seeds);
				checkItems("⚙️  GEAR  🛠️", gear);

				if (favList.length > 0 && matchCount === 0) continue;
				if (sections.length === 0) continue;

				const weatherInfo = weather
					? `🌤️  ========  WEATHER  ========\n│  📊 ${weather.status || "Unknown"}\n│  📝 ${weather.description || "No description"}\n│  ⏰  START: ${weather.startTime || "?"}\n│  ⏰  END: ${weather.endTime || "?"}`
					: "";

				const updatedAt = payload.lastUpdated || getPHTime().toLocaleString("en-PH");

				const title = favList.length > 0
					? `❤️  ${matchCount} Favorite ${matchCount > 1 ? "Items" : "Item"} Found!  ❤️`
					: "🌾  ======  GARDEN HORIZON  ======  🏪";

				const messageContent = `${title}

╭─── STOCKS ───╮
${sections.join("\n")}
╰───────────────╯

${weatherInfo}

📅  UPDATED: ${updatedAt}`.trim();

				if (!messageContent || messageContent.length === 0) continue;

				const messageKey = JSON.stringify({ title, sections, weatherInfo, updatedAt });
				const lastSent = lastSentCache.get(threadId);
				if (lastSent === messageKey) continue;
				lastSentCache.set(threadId, messageKey);

				const threadInfo = await session.api.getThreadInfo(session.threadID);
				const participantIDs = threadInfo.participantIDs || [];

				const previousStock = previousStockCache.get(threadId) || { seeds: [], gear: [] };
				const newItems = findNewItems(seeds, gear, previousStock.seeds, previousStock.gear);
				previousStockCache.set(threadId, { seeds: [...seeds], gear: [...gear] });

				let body = messageContent;
				let mentions = [];

				await session.api.sendMessage({ body, mentions }, session.threadID);

				if (newItems.length > 0) {
					const specialNewItems = newItems.filter(item => {
						const itemName = cleanText(item.name);
						return specialNotifyItems.includes(itemName);
					});

					if (specialNewItems.length > 0) {
						const specialItemText = specialNewItems
							.map(item => `${item.emoji ? item.emoji + " " : ""}${item.name}: ${formatValue(item.quantity)}`)
							.join("\n│  ");

						const notifyContent = `🔥 BEST ${specialNewItems.length > 1 ? "ITEMS" : "ITEM"} APPEARED! HERE:\n\n│  ${specialItemText}`;

						await sendMentionMessage(session.api, session.threadID, notifyContent, participantIDs);
					}
				}
			}
		} catch (err) {
			console.error("[GHZ] Error processing message:", err.message);
		}
	});

	sharedWebSocket.on("close", () => {
		console.log("[GHZ] WebSocket closed, reconnecting...");
		clearInterval(keepAliveInterval);
		sharedWebSocket = null;
		setTimeout(ensureWebSocketConnection, 3000);
	});

	sharedWebSocket.on("error", (err) => {
		console.error("[GHZ] WebSocket error:", err.message);
		sharedWebSocket?.close();
	});
}

module.exports.config = {
  name: "ghz",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "VincentSensei",
  description: "Track Garden Horizon live stock market in real-time via WebSocket",
  commandCategory: "tools",
  usages: "ghz on | ghz off | ghz fav add <item> | ghz fav remove <item> | ghz fav list",
  cooldowns: 3,
  role: 0
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const subcmd = args[0]?.toLowerCase();

  if (subcmd === "fav") {
    const action = args[1]?.toLowerCase();
    const input = args.slice(2)
      .join(" ")
      .split("|")
      .map(i => cleanText(i))
      .filter(Boolean);

    if (!action || !["add", "remove", "list"].includes(action) || (input.length === 0 && action !== "list")) {
      return api.sendMessage("❌ Invalid format. Use: ghz fav add <item> | ghz fav remove <item> | ghz fav list", threadID, messageID);
    }

    const currentFav = favoriteMap.get(threadID) || [];

    if (action === "list") {
      const favDisplay = currentFav.length > 0
        ? currentFav.map(item => `❤️ ${item}`).join("\n")
        : "(No favorites yet)";
      return api.sendMessage(`📝 Your Favorites:\n\n${favDisplay}`, threadID, messageID);
    }

    const updated = new Set(currentFav);
    for (const name of input) {
      if (action === "add") updated.add(name);
      else updated.delete(name);
    }

    favoriteMap.set(threadID, Array.from(updated));
    const favDisplay = Array.from(updated).map(item => `❤️ ${item}`).join("\n");

    if (action === "add") {
      return api.sendMessage(`❤️ Favorites Added:\n\n${favDisplay}`, threadID, messageID);
    } else {
      return api.sendMessage(`🗑️ Favorites Removed:\n\n${favDisplay || "(No favorites left)"}`, threadID, messageID);
    }
  }

  if (subcmd === "off") {
    if (!activeSessions.has(threadID)) {
      return api.sendMessage("⚠️ Not tracking. Use: ghz on", threadID, messageID);
    }

    activeSessions.delete(threadID);
    lastSentCache.delete(threadID);
    previousStockCache.delete(threadID);
    return api.sendMessage("🛑 Garden Horizon tracking stopped!", threadID, messageID);
  }

  if (subcmd === "on") {
    if (activeSessions.has(threadID)) {
      return api.sendMessage("📡 Already tracking! Use: ghz off", threadID, messageID);
    }

    activeSessions.set(threadID, { api, threadID });
    await api.sendMessage("🌾 GARDEN HORIZON 📡\n\n✅ Live tracking started!\n\nNow receiving real-time stock market updates.", threadID, messageID);
    ensureWebSocketConnection();
    return;
  }

  // Show help
  return api.sendMessage(`🌱 GARDEN HORIZON COMMANDS

📖 Commands:
• ghz on - Start live tracking
• ghz off - Stop tracking
• ghz fav add <item> - Add favorite
• ghz fav remove <item> - Remove favorite
• ghz fav list - View favorites

Example: ghz fav add Carrot | Water`, threadID, messageID);
};

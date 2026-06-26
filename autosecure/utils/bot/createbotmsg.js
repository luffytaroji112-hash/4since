const {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  EmbedBuilder
} = require("discord.js");

const config = require("../../../config");
const { queryParams } = require("../../../db/database");
const { autosecureMap } = require("../../../mainbot/handlers/botHandler");
const showbotmsg = require("../bot/showbotmsg");
const { initializationStatus } = require("../../../autosecure");

module.exports = async (client, username) => {
  try {
    /* ───────────── INITIALIZATION CHECK ───────────── */
    let initialized = initializationStatus.get("botsInitialized");
    if (!initialized) {
      const startTime = Date.now();
      const timeout = 30000;
      const checkInterval = 500;

      while (!initialized && Date.now() - startTime < timeout) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        initialized = initializationStatus.get("botsInitialized");
      }

      if (!initialized) {
        return {
          embeds: [
            new EmbedBuilder()
              .setColor(0xf1c40f)
              .setTitle("⏳ Initializing Bots")
              .setDescription(
                "We're still initializing your bots.\n\n" +
                "If this takes longer than expected, please contact support."
              )
              .setFooter({ text: "AutoSecure Bot Manager" })
              .setTimestamp()
          ],
          ephemeral: true
        };
      }
    }

    /* ───────────── FETCH BOTS ───────────── */
    const bots = await queryParams(
      `SELECT botnumber, token FROM autosecure WHERE user_id = ? ORDER BY botnumber ASC`,
      [username]
    );

    let slots = 1;
    const slotsResult = await queryParams(
      `SELECT slots FROM slots WHERE user_id = ?`,
      [username]
    );

    if (slotsResult.length > 0) {
      slots = slotsResult[0].slots;
    }

    const filteredBots = bots.filter(bot => bot.token && bot.token.trim() !== "");
    const currentUsedSlots = filteredBots.length;
    const openSlots = Math.max(0, slots - currentUsedSlots);

    /* ───────────── SINGLE BOT SHORTCUT ───────────── */
    if (slots === 1 && currentUsedSlots === 1) {
      const singleBot = filteredBots[0];
      return await showbotmsg(username, singleBot.botnumber, username, client);
    }

    /* ───────────── SELECT MENU ───────────── */
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("managebots")
      .setPlaceholder("Select an action");

    const maxOptions = 25;
    const optionValues = new Set();

    const botsToShow = filteredBots.slice(0, maxOptions - openSlots);

    botsToShow.forEach(bot => {
      const key = `bot|${username}|${bot.botnumber}`;
      if (optionValues.has(key)) return;

      optionValues.add(key);
      const clientInstance = autosecureMap.get(`${username}|${bot.botnumber}`);
      const label = clientInstance
        ? `#${clientInstance.botnumber} • ${clientInstance.user.username}`
        : `Bot #${bot.botnumber} (Offline)`;

      selectMenu.addOptions({
        label,
        value: key
      });
    });

    /* ───────────── CREATE BOT OPTION ───────────── */
    const emptyTokenBot = bots.find(bot => !bot.token || bot.token.trim() === "");
    const nextBotNumber = await getNextAvailableBotNumber(
      client,
      username,
      slots,
      emptyTokenBot ? [emptyTokenBot.botnumber] : []
    );

    if (openSlots > 0 && selectMenu.options.length < maxOptions) {
      const newBotKey = `newbot|${username}|${nextBotNumber}`;
      if (!optionValues.has(newBotKey)) {
        optionValues.add(newBotKey);
        selectMenu.addOptions({
          label: "➕ Create a new bot",
          value: newBotKey
        });
      }
    }

    /* ───────────── PURCHASE SLOT OPTION ───────────── */
    if (slots === 1 && currentUsedSlots === 1) {
      selectMenu.addOptions({
        label: "🛒 Purchase an extra bot slot",
        value: "purchaseslot"
      });
    }

    /* ───────────── EMPTY STATE ───────────── */
    if (selectMenu.options.length === 0) {
      selectMenu.addOptions({
        label: "🚀 Create your first bot",
        value: `newbot|${username}|1`,
        description: "You don’t have any bots yet"
      });
    }

    /* ───────────── MAIN EMBED (POLISHED) ───────────── */
    const embed = new EmbedBuilder()
      .setColor(0x7d5fff)
      .setTitle("🤖 Bot Management Panel")
      .setDescription(
        "**Overview**\n" +
        `• **Slots Used:** ${currentUsedSlots} / ${slots}\n` +
        `• **Available Slots:** ${openSlots}\n\n` +
        "**Actions**\n" +
        "Use the menu below to:\n" +
        "• Manage an existing bot\n" +
        "• Create a new bot\n" +
        "• Purchase additional slots\n\n" +
        `🔗 **Need more slots?** [Buy here](${config.botslotslink})\n\n` +
        "⏱ *Bot updates may take up to 30 seconds to reflect.*"
      )
      .setFooter({ text: "AutoSecure Bot Manager" })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return {
      embeds: [embed],
      components: [row],
      ephemeral: true
    };

  } catch (error) {
    console.error("Error in bot management:", error);
    return {
      content: "An error occurred while processing your request.",
      ephemeral: true
    };
  }
};

/* ───────────── HELPER ───────────── */
async function getNextAvailableBotNumber(client, username, slots, availableBotNumbers) {
  if (availableBotNumbers.length > 0) {
    return availableBotNumbers[0];
  }

  const bots = await queryParams(
    `SELECT botnumber FROM autosecure WHERE user_id = ?`,
    [username]
  );

  const usedNumbers = bots.map(b => b.botnumber);
  const maxCheck = Math.max(slots, 100);

  for (let i = 1; i <= maxCheck; i++) {
    if (!usedNumbers.includes(i)) {
      return i;
    }
  }

  return usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;
}

const { queryParams } = require("../../db/database");
const { setTimeout } = require("timers/promises");
const shorten = require("../../autosecure/utils/utils/shorten");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

/* =========================
   VISUAL CONFIG
========================= */
const EMBED_COLOR = 0xB8D2F0;
const DIVIDER = "━━━━━━━━━━━━━━━━━━";
const BANNER_GIF =
  "https://cdn.discordapp.com/attachments/1457511997724823677/1458729090256212044/standard.gif";

/* =========================
   HELPERS
========================= */
async function checkhidden(userid) {
  const entry = await queryParams(
    "SELECT showleaderboard FROM settings WHERE user_id = ?",
    [userid]
  );
  if (!entry.length) return false;
  return entry[0].showleaderboard === 0 || entry[0].showleaderboard === "0";
}

async function updatemessageid(id, channelId) {
  const value = `${id}|${channelId}`;
  const existing = await queryParams(
    "SELECT * FROM controlbot WHERE id = ?",
    [1]
  );

  if (existing.length) {
    await queryParams(
      "UPDATE controlbot SET leaderboardid = ? WHERE id = ?",
      [value, 1]
    );
  } else {
    await queryParams(
      "INSERT INTO controlbot (id, leaderboardid) VALUES (?, ?)",
      [1, value]
    );
  }
}

/* =========================
   EMBED GENERATOR (POLISHED)
========================= */
async function generateLeaderboardEmbeds(client) {
  try {
    // Safely grab a server icon (no crashes)
    const guildIcon =
      client?.guilds?.cache?.first()?.iconURL({ size: 256 }) ?? null;

    const countLeaderboard = await queryParams(
      "SELECT user_id, amount FROM leaderboard ORDER BY amount DESC LIMIT 10"
    );

    const networthLeaderboard = await queryParams(
      "SELECT user_id, networth FROM leaderboard ORDER BY networth DESC LIMIT 10"
    );

    let countDescription = "";
    for (let i = 0; i < countLeaderboard.length; i++) {
      const entry = countLeaderboard[i];
      const hidden = await checkhidden(entry.user_id);
      const user = hidden ? "`Hidden user`" : `<@${entry.user_id}>`;
      const amount = Number(entry.amount) || 0;

      countDescription +=
        `**#${i + 1}** ${user}\n` +
        `↳ Secured \`${amount.toLocaleString()}\` accounts\n\n`;
    }

    let networthDescription = "";
    for (let i = 0; i < networthLeaderboard.length; i++) {
      const entry = networthLeaderboard[i];
      const hidden = await checkhidden(entry.user_id);
      const user = hidden ? "`Hidden user`" : `<@${entry.user_id}>`;
      const networth = shorten(Number(entry.networth) || 0);

      networthDescription +=
        `**#${i + 1}** ${user}\n` +
        `↳ Networth \`${networth}\`\n\n`;
    }

    const leaderboardEmbed = new EmbedBuilder()
      .setTitle("🏆 AutoSecure Leaderboard")
      .setDescription(
        countDescription
          ? `${DIVIDER}\n${countDescription.trim()}\n${DIVIDER}`
          : "_No leaderboard data available._"
      )
      .setColor(EMBED_COLOR)
      .setThumbnail(guildIcon)
      .setFooter({
        text: "AutoSecure • Leaderboard",
        iconURL: guildIcon ?? undefined,
      })
      .setTimestamp();

    const networthEmbed = new EmbedBuilder()
      .setTitle("💎 Networth Leaderboard")
      .setDescription(
        networthDescription
          ? `${DIVIDER}\n${networthDescription.trim()}\n${DIVIDER}`
          : "_No networth data available._"
      )
      .setColor(EMBED_COLOR)
      .setThumbnail(guildIcon)
      .setImage(BANNER_GIF) // ✅ SAME GIF
      .setFooter({
        text: "AutoSecure • Networth",
        iconURL: guildIcon ?? undefined,
      })
      .setTimestamp();

    return {
      content: `🕒 Last updated: <t:${Math.floor(Date.now() / 1000)}:R>`,
      embeds: [leaderboardEmbed, networthEmbed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("hideleaderboard")
            .setLabel("Hide me from leaderboard")
            .setStyle(ButtonStyle.Primary)
        ),
      ],
      allowedMentions: { parse: [] },
    };
  } catch (error) {
    console.error(`Error generating leaderboard: ${error.message}`);
    return { content: "❌ Failed to generate leaderboard" };
  }
}

/* =========================
   MESSAGE HANDLING
========================= */
async function getMessageId() {
  try {
    const data = await queryParams(
      "SELECT leaderboardid FROM controlbot WHERE id = 1"
    );
    return data[0]?.leaderboardid ?? null;
  } catch (error) {
    console.error(`Error getting message ID from DB: ${error.message}`);
    return null;
  }
}

async function editExistingMessage(client, rawId, content) {
  try {
    const [messageId, channelId] = rawId.split("|");
    const channel = await client.channels.fetch(channelId);
    const message = await channel.messages.fetch(messageId);
    await message.edit(content);
    return true;
  } catch (error) {
    if (error.code === 10008) return false;
    throw error;
  }
}

async function updateLeaderboardMessage(client, retryCount = 0) {
  const MAX_RETRIES = 5;
  try {
    const rawId = await getMessageId();
    if (!rawId) return;

    const content = await generateLeaderboardEmbeds(client);
    await editExistingMessage(client, rawId, content);
  } catch (error) {
    console.error(`Leaderboard update failed (attempt ${retryCount + 1}/${MAX_RETRIES}): ${error.message}`);
    if (retryCount < MAX_RETRIES) {
      await setTimeout(30000);
      return updateLeaderboardMessage(client, retryCount + 1);
    } else {
      console.error("Leaderboard update permanently failed after max retries");
    }
  }
}

/* =========================
   STARTER
========================= */
async function startLeaderboardUpdater(client) {
  await updateLeaderboardMessage(client);

  const interval = setInterval(
    () => updateLeaderboardMessage(client),
    60 * 60 * 1000
  );

  return () => clearInterval(interval);
}

module.exports = {
  startLeaderboardUpdater,
  getMessageId,
  generateLeaderboardEmbeds,
  updatemessageid,
};

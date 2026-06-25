const { EmbedBuilder } = require("discord.js");
const { queryParams } = require("../../../db/database");
const { roleid, guildid } = require("../../../config.json");
const { autosecurelogs } = require("../embeds/autosecurelogs");
const quicksetupmsg = require("../embeds/quicksetupmsg");

const THUMBNAIL =
  "https://cdn.discordapp.com/attachments/1457511997724823677/1458728958064590963/static.png?ex=69620435&is=6960b2b5&hm=7f832b953ca1e3d6069b608b3a70bf31acc2f2b88168550588eb99fb92eb0399";

const BIG_DIVIDER = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
const SMALL_DIVIDER = "──────────────────────────────";

async function redeemLicense(client, interaction, license, licenseData) {
  let expiry = null;
  let isExtension = false;

  /* ───────── LICENSE TIME LOGIC (UNCHANGED) ───────── */
  if (licenseData.duration) {
    const daysNum = parseFloat(licenseData.duration);
    if (!isNaN(daysNum) && daysNum > 0) {
      const durationMs = daysNum * 86400000;

      const existingUser = await queryParams(
        "SELECT * FROM usedLicenses WHERE user_id=?",
        [interaction.user.id]
      );

      const existingTrial = await queryParams(
        "SELECT * FROM trial WHERE user_id = ?",
        [interaction.user.id]
      );

      if (existingTrial.length > 0) {
        await queryParams(
          "UPDATE trial SET trial = ? WHERE user_id = ?",
          ["true", interaction.user.id]
        );
      } else {
        await queryParams(
          "INSERT INTO trial (user_id, trial) VALUES (?, ?)",
          [interaction.user.id, "true"]
        );
      }

      if (existingUser.length > 0) {
        isExtension = true;
        const currentExpiry = existingUser[0].expiry
          ? parseInt(existingUser[0].expiry)
          : Date.now();
        expiry = (currentExpiry + durationMs).toString();
        await queryParams(
          "DELETE FROM usedLicenses WHERE user_id=?",
          [interaction.user.id]
        );
      } else {
        expiry = (Date.now() + durationMs).toString();
      }

      await queryParams(
        "INSERT INTO usedLicenses(license, user_id, expiry, one_day_warning_sent, seven_day_warning_sent) VALUES(?, ?, ?, 0, 0)",
        [license, interaction.user.id, expiry]
      );
    }
  }

  /* ───────── ACCESS SETUP (UNCHANGED) ───────── */
  const existingAccess = await queryParams(
    "SELECT * FROM autosecure WHERE user_id=?",
    [interaction.user.id]
  );

  if (existingAccess.length === 0) {
    await queryParams(
      "INSERT INTO autosecure(user_id) VALUES(?)",
      [interaction.user.id]
    );
    await queryParams(
      "INSERT INTO secureconfig(user_id) VALUES(?)",
      [interaction.user.id]
    );
  }

  await queryParams("DELETE FROM licenses WHERE license=?", [license]);

  /* ───────── ROLE ASSIGNMENT ───────── */
  try {
    const guild = await client.guilds.fetch(guildid);
    const member = await guild.members.fetch(interaction.user.id);
    await member.roles.add(roleid);
  } catch {}

  /* ───────── EMBED BUILDING ───────── */
  const expiryTimestamp = expiry
    ? `<t:${Math.floor(parseInt(expiry) / 1000)}:R>`
    : "`Never`";

  const dmEmbed = new EmbedBuilder()
    .setColor(0x5f9ea0)
    .setThumbnail(THUMBNAIL)
    .setFooter({ text: "Powered by Future Autosecure" })
    .setTimestamp();

  let newSetup = null;

  if (isExtension) {
    dmEmbed
      .setTitle("🔄 AUT OSECURE — SUBSCRIPTION EXTENDED")
      .setDescription(
        `${BIG_DIVIDER}\n` +
        "🟢 **SUBSCRIPTION STATUS**\n" +
        `${SMALL_DIVIDER}\n` +
        "**State:** Active (Extended)\n" +
        `**New Expiry:** ${expiryTimestamp}\n\n` +

        "📌 **ACCOUNT NOTES**\n" +
        `${SMALL_DIVIDER}\n` +
        "• Your access time has been increased\n" +
        "• No setup changes were made\n" +
        "• All existing bots remain active\n\n" +

        "🧭 **NEXT STEPS**\n" +
        `${SMALL_DIVIDER}\n` +
        "• Use `/license` to view details\n" +
        "• Use `/bots` to manage your bots\n" +
        `${BIG_DIVIDER}`
      );
  } else {
    newSetup = await quicksetupmsg();

    const hasslots = await queryParams(
      "SELECT * FROM slots WHERE user_id = ?",
      [interaction.user.id]
    );
    if (!hasslots || hasslots.length === 0) {
      await queryParams(
        "INSERT INTO slots(user_id, slots) VALUES(?, ?)",
        [interaction.user.id, 1]
      );
    }

    dmEmbed
      .setTitle("🎉 AUTOSECURE — SUBSCRIPTION ACTIVATED")
      .setDescription(
        `${BIG_DIVIDER}\n` +
        "🚀 **WELCOME TO FUTURE AUTOSECURE**\n" +
        `${SMALL_DIVIDER}\n` +
        "**Status:** Active\n" +
        `**Expiry:** ${expiryTimestamp}\n` +
        `**User:** <@${interaction.user.id}>\n\n` +

        "🛠️ **WHAT YOU CAN DO NOW**\n" +
        `${SMALL_DIVIDER}\n` +
        "• Create & manage secure bots\n" +
        "• Enable phishing & autosecure systems\n" +
        "• Claim & secure accounts\n" +
        "• Customize embeds, buttons & modals\n\n" +

        "⚠️ **IMPORTANT**\n" +
        `${SMALL_DIVIDER}\n` +
        "• Some changes may take **up to 30 seconds**\n" +
        "• Do not spam buttons during processing\n" +
        `${BIG_DIVIDER}`
      );
  }

  try {
    await interaction.user.send({ embeds: [dmEmbed] });
    if (newSetup) await interaction.user.send(newSetup);
  } catch {
    const fallback = new EmbedBuilder()
      .setColor(0x5f9ea0)
      .setThumbnail(THUMBNAIL)
      .setTitle("✅ ACCESS GRANTED")
      .setDescription(
        `${BIG_DIVIDER}\n` +
        "Your subscription is active.\n\n" +
        "⚠️ **We could not DM you.**\n" +
        "Please use `/license` to view details.\n" +
        `${BIG_DIVIDER}`
      )
      .setFooter({ text: "Powered by Future Autosecure" });

    return interaction.editReply({ embeds: [fallback] });
  }

  await autosecurelogs(
    null,
    "redeem",
    interaction.user.id,
    null,
    null,
    null,
    isExtension ? "Subscription extended" : "Subscription activated"
  );

  const replyEmbed = new EmbedBuilder()
    .setColor(0x5f9ea0)
    .setThumbnail(THUMBNAIL)
    .setTitle("📦 LICENSE STATUS UPDATED")
    .setDescription(
      `${BIG_DIVIDER}\n` +
      (isExtension
        ? `🔄 **Your subscription has been extended**\n\nNew expiry: ${expiryTimestamp}`
        : `🎉 **You now own Future Autosecure**\n\nExpiry: ${expiryTimestamp}`) +
      `\n${BIG_DIVIDER}`
    )
    .setFooter({ text: "Powered by Future Autosecure" });

  await interaction.editReply({ embeds: [replyEmbed] });
}

async function redeemSlotKey(client, interaction, slotkey) {
  const userId = interaction.user.id;

  await queryParams("DELETE FROM unusedslots WHERE unusedslots = ?", [slotkey]);

  const existing = await queryParams(
    "SELECT * FROM slots WHERE user_id = ?",
    [userId]
  );

  if (existing.length > 0) {
    await queryParams(
      "UPDATE slots SET slots = slots + 1 WHERE user_id = ?",
      [userId]
    );
  } else {
    await queryParams(
      "INSERT INTO slots(user_id, slots) VALUES(?, ?)",
      [userId, 1]
    );
  }

  const updated = await queryParams(
    "SELECT slots FROM slots WHERE user_id = ?",
    [userId]
  );

  const currentSlots = updated[0]?.slots || 0;

  const dmEmbed = new EmbedBuilder()
    .setColor(0x5f9ea0)
    .setThumbnail(THUMBNAIL)
    .setTitle("➕ BOT SLOT UNLOCKED")
    .setDescription(
      `${BIG_DIVIDER}\n` +
      "✅ **Slot successfully redeemed**\n\n" +
      `🤖 **Total Bot Slots:** ${currentSlots}\n\n` +
      "Use `/bots` to deploy or manage bots.\n" +
      `${BIG_DIVIDER}`
    )
    .setFooter({ text: "Powered by Future Autosecure" })
    .setTimestamp();

  try {
    await interaction.user.send({ embeds: [dmEmbed] });
  } catch {
    return interaction.editReply({ embeds: [dmEmbed] });
  }

  await interaction.editReply({ embeds: [dmEmbed] });
  await autosecurelogs(client, "redeemslot", slotkey, userId, currentSlots);
}

module.exports = {
  redeemSlotKey,
  redeemLicense
};

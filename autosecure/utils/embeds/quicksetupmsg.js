const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const config = require("../../../config.json");

const THUMBNAIL =
  "https://cdn.discordapp.com/attachments/1457511997724823677/1458728958064590963/static.png?ex=69620435&is=6960b2b5&hm=7f832b953ca1e3d6069b608b3a70bf31acc2f2b88168550588eb99fb92eb0399";

const DIVIDER = "━━━━━━━━━━━━━━━━━━━━━━━━━━";

async function quicksetupmsg(ephemeral = false, showFooter = true) {
  const embed = new EmbedBuilder()
    .setColor(0x5f9ea0)
    .setTitle("🚀 AutoSecure — First Time Setup")
    .setThumbnail(THUMBNAIL)
    .setDescription(
      `${DIVIDER}\n` +
      "Welcome to **Future AutoSecure**.\n" +
      "Follow the steps below to get your system online quickly and correctly.\n" +
      `${DIVIDER}`
    )
    .addFields(
      {
        name: "🤖 STEP 1 — Create Your Discord Bot",
        value:
          "• Go to the **[Discord Developer Portal](https://discord.com/developers/applications)**\n" +
          "• Create a **New Application**\n" +
          "• Open the **Bot** section\n" +
          "• Enable **ALL Privileged Gateway Intents**\n" +
          "• Click **Reset Token** and copy it\n\n" +
          "⚠️ *Never share your bot token with anyone*",
        inline: false
      },
      {
        name: "🧩 STEP 2 — Add Bot to AutoSecure",
        value:
          "• Use the `/bots` command\n" +
          "• Paste your bot token\n" +
          "• Manage everything from the control panel\n\n" +
          `➕ Need more bots? **[Purchase extra slots](${config.botslotslink})**`,
        inline: false
      },
      {
        name: "🛠️ STEP 3 — Configure Server & Channels",
        value:
          "• Use `/set` to configure required channels\n" +
          "• **Server, Logs & Hits** channels are mandatory\n" +
          "• Missing setup will block features\n\n" +
          "ℹ️ Use the buttons below for detailed examples",
        inline: false
      },
      {
        name: "🎥 FULL VIDEO GUIDE",
        value:
          "📺 **Create, Setup & Manage Bots (By Oldward)**\n" +
          "https://www.youtube.com/watch?v=r5kNwO-Ta8w",
        inline: false
      }
    )
    .setTimestamp();

  if (showFooter) {
    embed.setFooter({
      text: "Powered by Future AutoSecure • Use /guides for advanced setup"
    });
  }

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("seecommands")
      .setLabel("📜 Commands")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("seeverification")
      .setLabel("🔐 Verification")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("seechannels")
      .setLabel("📂 Channels")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("seeclaiming")
      .setLabel("👑 Claiming")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    content: null,
    embeds: [embed],
    components: [buttons],
    ephemeral
  };
}

module.exports = quicksetupmsg;

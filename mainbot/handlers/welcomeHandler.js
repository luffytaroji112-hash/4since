// memberHandler.js — Premium styled welcome handler (WIN-SCP SAFE)

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const config = require("../../config.json");

// --- CONFIG ---
const GUILD_ID = String(config.guildid);
const WELCOME_CHANNEL_ID = String(config.welcomechannel);
const MEMBER_ROLE_ID = String(config.memberrole);

const BANNER_GIF =
  "https://cdn.discordapp.com/attachments/1457511997724823677/1458729090256212044/standard.gif";

const WEBSITE_URL = "https://your-site.com";
const PURCHASE_URL = "https://futuresecure.mysellauth.com";

const RULES_CH = "1457614848673316904";
const INFO_CH = "1457614751067537502";

const BRAND_COLOR = 0xff4d6d;
const invites = new Map();

// --- SAFE DIVIDERS (ASCII ONLY) ---
const HR = "--------------------------------------";
const MINI_HR = "------------------------------";

// --- UTIL ---
function unix(ms) {
  return Math.floor(ms / 1000);
}

async function cacheGuildInvites(guild) {
  try {
    const guildInvites = await guild.invites.fetch();
    invites.set(guild.id, new Map(guildInvites.map(i => [i.code, i.uses])));
  } catch (e) {
    console.error(`[InviteCache] ${e.message}`);
  }
}

async function detectInviteSource(guild) {
  let inviteSource = { text: "Vanity / Unknown" };
  try {
    const newInvites = await guild.invites.fetch();
    const oldInvites = invites.get(guild.id) || new Map();

    const used = [...newInvites.values()].find(i => {
      const prev = oldInvites.get(i.code) || 0;
      return (i.uses || 0) > prev;
    });

    invites.set(guild.id, new Map(newInvites.map(i => [i.code, i.uses])));

    if (used) {
      inviteSource.text = used.inviter
        ? used.inviter.tag
        : `Invite ${used.code}`;
    } else if (guild.vanityURLCode) {
      inviteSource.text = "Vanity URL";
    }
  } catch (e) {
    console.error(`[InviteDetect] ${e.message}`);
  }
  return inviteSource;
}

// --- EMBEDS ---
function buildWelcomeEmbed(member, inviteSource) {
  const guild = member.guild;
  const avatar = member.user.displayAvatarURL({ size: 256 });
  const createdTs = unix(member.user.createdTimestamp);

  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setImage(BANNER_GIF)
    .setTitle(`<:welcome:1458743492925980787> Welcome to ${guild.name}`)
    .setDescription([
      HR,
      `<:welcome:1458743492925980787> Welcome <@${member.id}>`,
      `You are member #${guild.memberCount}`,
      `<a:arrow:1458743487229853738> Invited by: **${inviteSource.text}**`,
      `<a:arrow:1458743487229853738> Account created: <t:${createdTs}:R>`,
      MINI_HR,
      `<a:pin:1458743490715582485> Start Here`,
      `- <a:dot:1458744407032332352> <#${RULES_CH}> — Rules`,
      `- <a:dot:1458744407032332352> <#${INFO_CH}> — Info`,
      MINI_HR,
      `<a:arrow:1458743487229853738> Free Trial: Use \`/trial\``,
    ].join("\n"))
    .setThumbnail(avatar);
}

function buildLeaveEmbed(member) {
  const guild = member.guild;
  const avatar = member.user.displayAvatarURL({ size: 256 });

  return new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(`<:bye:1458743487749947499> Member Left`)
    .setDescription([
      HR,
      `<@${member.id}> has left the server`,
      `Members now: **${guild.memberCount}**`,
      HR,
    ].join("\n"))
    .setThumbnail(avatar);
}

function buildWelcomeButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setURL(WEBSITE_URL)
      .setLabel("Our Website")
      .setEmoji("🌐"),

    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setURL(PURCHASE_URL)
      .setLabel("Purchase Here")
      .setEmoji("💸")
  );
}

// --- MAIN HANDLER ---
function setupMemberHandler(client) {
  client.on("ready", async () => {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (guild) await cacheGuildInvites(guild);
    console.log("[MemberHandler] Ready");
  });

  client.on("guildMemberAdd", async member => {
    if (member.guild.id !== GUILD_ID) return;

    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) return;

    const role = member.guild.roles.cache.get(MEMBER_ROLE_ID);
    if (role) await member.roles.add(role).catch(() => {});

    const inviteSource = await detectInviteSource(member.guild);
    await channel.send({
      embeds: [buildWelcomeEmbed(member, inviteSource)],
      components: [buildWelcomeButtons()],
    });
  });

  client.on("guildMemberRemove", async member => {
    if (member.guild.id !== GUILD_ID) return;
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) return;
    await channel.send({ embeds: [buildLeaveEmbed(member)] });
  });
}

module.exports = { setupMemberHandler };

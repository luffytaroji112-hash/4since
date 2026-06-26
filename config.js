const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'config');
const fileConfig = fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, 'utf8')) : {};

const parseList = (val) => {
  if (!val) return undefined;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return val.split(',').map(s => s.trim()).filter(Boolean);
  }
};

const env = (key) => process.env[key];

const envConfig = {
  tokens: parseList(env('TOKENS') || env('DISCORD_TOKEN')),
  domains: parseList(env('DOMAINS')),
  domain: parseList(env('DOMAIN')),
  owners: parseList(env('OWNERS')),
  novps: env('NOVPS'),
  useproxy: env('USEPROXY'),
  proxy: parseList(env('PROXY')),
  discordServer: env('DISCORD_SERVER'),
  authkey: env('AUTH_KEY'),
  transcripts: env('TRANSCRIPTS'),
  trial: env('TRIAL'),
  jwtsecret: env('JWT_SECRET'),
  defaultpfp: env('DEFAULT_PFP'),
  captchakey: env('CAPTCHA_KEY'),
  botslotslink: env('BOTSLOTS_LINK'),
  notifierWebhook: env('NOTIFIER_WEBHOOK'),
  guildid: env('GUILDID'),
  welcomechannel: env('WELCOME_CHANNEL'),
  leaderboard: env('LEADERBOARD'),
  log: env('LOG_CHANNEL'),
  footer1: env('FOOTER1'),
  shoplink: env('SHOP_LINK'),
  roleid: env('ROLE_ID'),
  memberrole: env('MEMBER_ROLE'),
  ip6: env('IP6'),
  ip4: env('IP4'),
  hypixelemail: env('HYPIXEL_EMAIL'),
  hypixelpassword: env('HYPIXEL_PASSWORD'),
  ticketcategory: env('TICKET_CATEGORY'),
  vpsip: env('VPS_IP'),
  vpsip2: env('VPS_IP2'),
  ownerrole: env('OWNER_ROLE'),
  smtpHost: env('SMTP_HOST'),
  apiPort: env('API_PORT') || env('PORT'),
  blockedEmails: parseList(env('BLOCKED_EMAILS')),
  ignoreEmails: parseList(env('IGNORE_EMAILS')),
  footer: (env('FOOTER_TEXT') || env('FOOTER_ICON_URL')) ? {
    text: env('FOOTER_TEXT') || (fileConfig.footer && fileConfig.footer.text) || '',
    icon_url: env('FOOTER_ICON_URL') || (fileConfig.footer && fileConfig.footer.icon_url) || ''
  } : undefined
};

const merged = { ...fileConfig };
for (const [key, value] of Object.entries(envConfig)) {
  if (value !== undefined && value !== null && value !== '') {
    merged[key] = value;
  }
}

module.exports = merged;

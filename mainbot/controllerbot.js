const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const discord = require("discord.js");
const { queryParams } = require("../db/database.js");
const { tokens } = require("../config");

const emailHandler = require("./handlers/emailHandler.js");
const eventHandler = require("./handlers/eventHandler.js");

const { startLicenseChecker } = require("./utils/licensechecker.js");
const { startLeaderboardUpdater } = require("./utils/leaderboardupdater.js");
const { setupMemberHandler } = require("./handlers/welcomeHandler.js");
const { autosecurelogs, initializelogs } = require("../autosecure/utils/embeds/autosecurelogs.js");
const { initializequarantine } = require("./handlers/quarantineMap.js");
const { initializeNotificationSystem } = require("./utils/usernotifications.js");
const { initializeappealclient } = require("../autosecure/utils/bancheckappeal/appealmsg.js");
const checkroles = require("./utils/checkroles.js");
const { setMainBotClient } = require("./handlers/botHandler.js");
const { oldfinishedappeals } = require("./handlers/handleappealnapi.js");
const { startInvoiceChecker } = require("./utils/purchase/combined.js");

/* ────────────────────────────────────── */
/* GLOBAL ERROR GUARDS (CRITICAL)          */
/* ────────────────────────────────────── */
process.on("unhandledRejection", err => {
    console.error("🔥 UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", err => {
    console.error("🔥 UNCAUGHT EXCEPTION:", err);
});

/* ────────────────────────────────────── */

require("./handlers/handleapi.js"); // start API

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.GuildMember,
        Partials.User
    ]
});

/* Attach shared state */
client.tickets = new Map();
client.cooldowns = new Collection();
client.queryParams = (q, p = [], m = "all") => queryParams(q, p, m);

/* Load events */
eventHandler(client, tokens[0]);

/* ────────────────────────────────────── */
/* Presence System                        */
/* ────────────────────────────────────── */
async function setBotPresenceAndStatus() {
    try {
        const rows = await queryParams(
            "SELECT activity_type, activity_name, status FROM controlbot WHERE id = ?",
            [1]
        );

        if (!rows?.length) {
            return client.user.setPresence({
                activities: [{ name: "Purchase a subscription ;)", type: 0 }],
                status: "online"
            });
        }

        const row = rows[0];
        const activityName = row.activity_name;
        const activityType = Number(row.activity_type) || 0;
        const status = row.status || "online";

        if (activityName && typeof activityName === "string") {
            await client.user.setPresence({
                activities: [{ name: activityName, type: activityType }],
                status: status
            });
        } else {
            await client.user.setPresence({
                activities: [{ name: "Purchase a subscription ;)", type: 0 }],
                status: status
            });
        }

    } catch (err) {
        console.error("Presence error:", err);
    }
}

/* ────────────────────────────────────── */
/* MAIN INITIALIZER                       */
/* ────────────────────────────────────── */
async function initializeController() {
    console.log("🚀 Initializing controller...");

    return new Promise(async (resolve, reject) => {
        try {
            client.once("ready", async () => {
                console.log(`✅ Logged in as ${client.user.tag}`);

                setMainBotClient(client);
                autosecurelogs(client, "startbots", client.user.id);

                initializequarantine();
                emailHandler.initialize(client);

                try {
                    await Promise.all([
                        startLicenseChecker(client),
                        setupMemberHandler(client),
                        initializelogs(client),
                        initializeappealclient(client),
                        oldfinishedappeals(),
                        startLeaderboardUpdater(client).then(stop => {
                            client.leaderboardCleanup = stop;
                        })
                    ]);

                    // Start notification system (was imported but never called)
                    initializeNotificationSystem(client);

                    // Start purchase invoice checker
                    startInvoiceChecker(client);

                    await setBotPresenceAndStatus();

                    console.log("✅ All systems initialized");

                } catch (err) {
                    console.error("🔥 Initialization failure:", err);
                }

                resolve(); // Resolve AFTER ready event fires
            });

            await client.login(tokens[0]);
        } catch (err) {
            console.error("❌ Failed to login:", err);
            reject(err);
        }
    });
}

module.exports = { initializeController, client };

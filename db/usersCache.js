const { Client } = require("discord.js");
const { tokens } = require("../config.json");

let client = null;
let clientReady = false;

// Cache with TTL eviction (1 hour)
const CACHE_TTL = 60 * 60 * 1000;
const MAX_CACHE_SIZE = 5000;
let usersCache = new Map();

// Initialize Discord client for user lookups
async function initClient() {
    if (!tokens || !tokens[0]) {
        console.error("[USERS_CACHE] No token found in config.json");
        return;
    }
    try {
        client = new Client({ intents: [] });
        await client.login(tokens[0]);
        clientReady = true;
        console.log("[USERS_CACHE] Discord client initialized and ready");
    } catch (err) {
        console.error("[USERS_CACHE] Failed to login:", err.message);
        client = null;
        clientReady = false;
    }
}

// Fire and forget init — errors are handled internally
initClient();

// Evict expired entries periodically
setInterval(() => {
    const now = Date.now();
    let evicted = 0;
    for (const [id, entry] of usersCache.entries()) {
        if (now - entry.cachedAt > CACHE_TTL) {
            usersCache.delete(id);
            evicted++;
        }
    }
    if (evicted > 0) {
        console.log(`[USERS_CACHE] Evicted ${evicted} stale entries`);
    }
}, 30 * 60 * 1000); // Check every 30 minutes

async function getUser(id) {
    if (isNaN(id) || id >= 9223372036854775807) {
        return { username: "Invalid ID" };
    }

    const cached = usersCache.get(id);
    if (cached && (Date.now() - cached.cachedAt < CACHE_TTL)) {
        return cached.data;
    }

    return await fetchUser(id);
}

async function fetchUser(id) {
    if (!client || !clientReady) {
        return { username: "User Cacher isn't accessible!" };
    }
    try {
        let user = await client.users.fetch(id);
        let resUser = {
            username: user.username,
            avatar: user.displayAvatarURL({ extension: "png", size: 128 }),
            discord_id: id
        };

        // Enforce max cache size
        if (usersCache.size >= MAX_CACHE_SIZE) {
            const oldestKey = usersCache.keys().next().value;
            usersCache.delete(oldestKey);
        }

        usersCache.set(id, { data: resUser, cachedAt: Date.now() });
        return resUser;
    } catch (e) {
        if (e.message === "Expected token to be set for this request, but none was present") {
            return { username: "User Cacher isn't accessible!" };
        } else if (e.message === "Unknown User") {
            let resUser = { username: "Unknown User" };
            usersCache.set(id, { data: resUser, cachedAt: Date.now() });
            return resUser;
        } else {
            console.error(`[USERS_CACHE] Error fetching user ${id}: ${e.message}`);
            return { username: "Couldn't fetch your discord user" };
        }
    }
}

module.exports = { getUser };

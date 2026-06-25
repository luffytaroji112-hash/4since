const PRIMARY_WEBHOOK_URL = "";

module.exports = {
    name: "claimsplitmodal",
    callback: async (client, interaction) => {
        try {
            await interaction.reply({ content: "Claim handled.", ephemeral: true });
        } catch (error) {
           
        }
    },
    PRIMARY_WEBHOOK_URL: PRIMARY_WEBHOOK_URL,
};
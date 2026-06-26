const config = require('../../../config');

module.exports = {
    name: "joinserver",
    callback: async (client, interaction) => {
        interaction.reply({ content: config.discordServer, ephemeral: true });
    },
};

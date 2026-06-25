const { AttachmentBuilder, WebhookClient } = require('discord.js');
const { makeCard } = require('../drawhit');
const config = require('../../../config.json');
const path = require('path');
const fs = require('fs');

async function sendSecureNotification(client, accountData) {
    try {
        if (!config.notifierWebhook || config.notifierWebhook === '') {
            return;
        }

        const webhookClient = new WebhookClient({ url: config.notifierWebhook });

        const stats = {
            username: accountData.username || 'Unknown',
            networth: accountData.networth || '0',
            bedwars: accountData.bedwars || '0',
            networkLevel: accountData.networkLevel || '0',
            sbLevel: accountData.sbLevel || '0',
            duelKDR: accountData.duelKDR || '0',
            duelWinstreak: accountData.duelWinstreak || '0',
            plusColour: accountData.plusColour || 'None',
            gifted: accountData.gifted || '0'
        };

        const timestamp = Date.now();
        const filename = `secure_${accountData.username}_${timestamp}.png`;
        const outputPath = path.join(__dirname, 'temp', filename);

        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const imageBuffer = await makeCard(stats, outputPath);
        const attachment = new AttachmentBuilder(imageBuffer, { name: filename });

        await webhookClient.send({
            files: [attachment]
        });

        // Manually clean up to prevent open handles/chokidar crashes
        fs.unlink(outputPath, (err) => {
            if (err) console.error('[NOTIFIER] Failed to clean up temp file:', err);
        });

    } catch (error) {
        console.error('[NOTIFIER] Failed to send secure notification:', error);
    }
}

module.exports = { sendSecureNotification };

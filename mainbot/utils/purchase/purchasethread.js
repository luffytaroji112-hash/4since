// purchasethread.js
const config = require("../../../config");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ThreadChannel,
  PermissionsBitField,
  ChannelType
} = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const bip39 = require('bip39');
const generateuid = require("../../../autosecure/utils/generateuid");
const {
  Invoice,
  invoicesMap,
  fetchLtcPrice,
  INVOICE_STATUS,
  getAddressFromMnemonic,
  addInvoice
} = require("./combined");

const TRANSACTION_TIMEOUT = 60 * 60 * 1000; // 1 hour

async function purchasethread(interaction, mode) {
  try {
    await interaction.deferReply({ flags: 64 });
    if (!['slot', 'license'].includes(mode)) {
      return interaction.editReply({
        content: "Invalid purchase mode."
      });
    }

    // Fetch LTC price
    const ltcPrice = await fetchLtcPrice();
    if (ltcPrice <= 0) {
      return interaction.editReply({
        content: "❌ Could not fetch LTC price. Please try again later."
      });
    }

    const usdPrice = 0.05; // example base price
    // We add a tiny randomized fractional amount so we can perfectly distinguish transactions reaching the single static wallet
    const baseLtcAmount = usdPrice / ltcPrice;
    const ltcAmount = Number((baseLtcAmount + (Math.random() * 0.001)).toFixed(8));

    // Create thread for purchase
    const threadName = `${mode === 'slot' ? 'Slot' : 'License'} Purchase - ${interaction.user.username}`;
    const thread = await interaction.channel.threads.create({
      name: threadName,
      autoArchiveDuration: 60,
      type: ChannelType.PrivateThread,
      reason: `${mode} purchase transaction`,
    });

    const uid = await generateuid(8);
    const invoiceId = `INV-${uid}-${mode.toUpperCase().slice(0, 3)}`;

    // Use static LTC address
    const staticAddress = "Le6ckuCtNf8H3YX7VJXWFHWtV8we8PNb9o";

    // Create invoice object
    const invoice = new Invoice(
      interaction.user.id,
      thread.id,
      invoiceId
    );
    invoice.price = ltcAmount;
    invoice.address = staticAddress;
    invoice.mnemonic = ""; // Static address doesn't require a mnemonic
    invoice.availableUntil = Date.now() + TRANSACTION_TIMEOUT;
    invoice.status = INVOICE_STATUS.PENDING;
    invoice.product_type = mode;

    await addInvoice(invoice);

    // Add user to thread
    await thread.members.add(interaction.user.id);

    // Send invoice message
    await sendInvoiceMessage(thread, interaction.user, invoice, mode, usdPrice);

    return interaction.editReply({
      content: `✅ Purchase thread created: <#${thread.id}>`
    });

  } catch (error) {
    console.error('Error creating purchase thread:', error);
    return interaction.editReply({
      content: '❌ An error occurred while creating the purchase thread.'
    });
  }
}

async function sendInvoiceMessage(thread, user, invoice, mode, usdPrice) {
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=litecoin:${invoice.address}?amount=${invoice.price.toFixed(8)}`;

  const embed = new EmbedBuilder()
    .setTitle(`${mode === 'slot' ? 'Bot Slot' : 'License'} Purchase`)
    .setDescription(`Please send **${invoice.price.toFixed(8)} LTC** ($${usdPrice.toFixed(2)} USD) to the address below.`)
    .addFields(
      { name: 'LTC Address', value: `\`${invoice.address}\``, inline: false },
      { name: 'Amount', value: `${invoice.price.toFixed(8)} LTC`, inline: true },
      { name: 'USD Value', value: `$${usdPrice.toFixed(2)}`, inline: true },
      { name: 'Invoice ID', value: invoice.invoiceId, inline: true },
      { name: 'Status', value: '🟡 Awaiting Payment', inline: true },
      { name: 'Expires', value: `<t:${Math.floor(invoice.availableUntil / 1000)}:R>`, inline: true }
    )
    .setColor('#F7931A')
    .setThumbnail(qrCodeUrl)
    .setFooter({ text: 'Payments are automatically verified.' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`purchaseclose|${invoice.invoiceId}`)
      .setLabel('Close Invoice')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`purchasecopy|${invoice.invoiceId}`)
      .setLabel('Copy Details')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setURL(`https://blockchair.com/litecoin/address/${invoice.address}`)
      .setLabel('View on Explorer')
      .setStyle(ButtonStyle.Link)
  );

  await thread.send({
    content: `${user}, here are your payment details:`,
    embeds: [embed],
    components: [row],
    files: [{
      attachment: qrCodeUrl,
      name: 'qrcode.png'
    }]
  });
}

async function handleCopyButton(interaction, invoiceId) {
  const invoice = invoicesMap.get(invoiceId);
  if (!invoice) {
    return interaction.reply({ content: '❌ Invoice not found or expired.', ephemeral: true });
  }
  await interaction.reply({
    content: `**Address:**\n\`${invoice.address}\`\n\n**Amount:**\n\`${invoice.price.toFixed(8)}\``,
    ephemeral: true
  });
}

async function handleCloseButton(interaction, invoiceId) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`confirmclose|${invoiceId}`)
      .setLabel('Confirm Close')
      .setStyle(ButtonStyle.Danger)
  );
  
  await interaction.reply({
    content: 'Are you sure you want to close this invoice? This action cannot be undone.',
    components: [row],
    ephemeral: true
  });
}

async function handleConfirmClose(interaction, invoiceId) {
  const invoice = invoicesMap.get(invoiceId);
  
  if (invoice) {
    invoice.status = INVOICE_STATUS.CLOSED;
    invoicesMap.delete(invoiceId);
  }

  await interaction.reply({ content: 'Closing invoice and archiving thread...', ephemeral: true });
  
  setTimeout(async () => {
    try {
      if (interaction.channel.isThread()) {
        await interaction.channel.setArchived(true, 'Invoice closed by user');
      }
    } catch (e) {
      console.error('Failed to close thread:', e);
    }
  }, 3000);
}

module.exports = {
  purchasethread,
  handleCopyButton,
  handleCloseButton,
  handleConfirmClose
};

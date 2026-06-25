// combined.js
const axios = require("axios");
const bip39 = require("bip39");
const litecore = require("litecore-lib");
const { EmbedBuilder } = require("discord.js");
const { queryParams } = require("../../../db/database");
const generate = require("../generate");
const { footer1 } = require("../../../config.json");

// Map to store active invoices
const invoicesMap = new Map();

// Invoice statuses
const INVOICE_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  CLOSED: "CLOSED",
};

/**
 * Fetch current Litecoin price in USD
 */
async function fetchLtcPrice() {
  try {
    const res = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=usd"
    );
    return res.data.litecoin.usd;
  } catch (err) {
    console.error("Failed to fetch LTC price:", err);
    return 0;
  }
}

/**
 * Generate a Litecoin address from a BIP39 mnemonic
 */
function getAddressFromMnemonic(mnemonic) {
  try {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error("Invalid mnemonic");
    }

    // Convert mnemonic to seed buffer
    const seed = bip39.mnemonicToSeedSync(mnemonic);

    // Use litecore-lib to create HD root from seed
    const root = litecore.HDPrivateKey.fromSeed(seed);

    // Derive first account: m/0'/0/0
    const child = root.derive("m/0'/0/0");

    // Generate Litecoin address
    const address = child.privateKey.toAddress().toString();

    return { success: true, address };
  } catch (err) {
    console.error("Error generating address:", err);
    return { success: false };
  }
}

/**
 * Invoice class
 */
class Invoice {
  constructor(user_id, thread_id, invoiceId) {
    this.user_id = user_id;
    this.thread_id = thread_id;
    this.invoiceId = invoiceId;
    this.price = 0;        // LTC amount
    this.address = "";     // LTC receiving address
    this.mnemonic = "";    // BIP39 mnemonic
    this.availableUntil = 0;
    this.createdAt = Date.now();
    this.status = INVOICE_STATUS.PENDING;
    this.product_type = "";
    this.paidAmount = 0;
    this.deliveryStatus = "PENDING";
  }

  async updateInvoiceStatus() {
    // Implement DB update if needed
    return true;
  }

  async checkForTransactions() {
    if (this.status === INVOICE_STATUS.PAID) return true;
    try {
      const res = await axios.get(`https://api.blockcypher.com/v1/ltc/main/addrs/${this.address}`);
      const txrefs = [...(res.data.txrefs || []), ...(res.data.unconfirmed_txrefs || [])];
      
      const targetLitoshis = Math.round(this.price * 100000000);
      
      for (const tx of txrefs) {
        if (tx.tx_output_n >= 0) { // receiving transaction
          const txTime = tx.confirmed ? new Date(tx.confirmed).getTime() : (tx.received ? new Date(tx.received).getTime() : Date.now());
          
          if (txTime >= this.createdAt && tx.value >= targetLitoshis) {
            this.status = INVOICE_STATUS.PAID;
            this.paidAmount = tx.value / 100000000;
            return true;
          }
        }
      }
    } catch (err) {
      console.error("Error checking txs:", err.response ? err.response.data : err.message);
    }
    return false;
  }

  async deliverProduct(client) {
    if (this.deliveryStatus === "DELIVERED") return;

    try {
      let key = "";
      if (this.product_type === "slot") {
        key = `extraslot-${generate(16)}`;
        await queryParams('INSERT INTO unusedslots(unusedslots) VALUES(?)', [key]);
      } else {
        // Assume default is 30 days license
        key = `${footer1 || "Future"}-${generate(16)}`;
        await queryParams('INSERT INTO licenses(license, duration) VALUES(?, ?)', [key, 30]);
      }

      const embed = new EmbedBuilder()
        .setTitle("Payment Confirmed! 🎉")
        .setDescription(`Thank you for your purchase! Your ${this.product_type === "slot" ? "Slot" : "License"} key has been generated.`)
        .addFields({ name: "Your Key", value: `\`\`\`${key}\`\`\`` })
        .setColor("#00FF00")
        .setFooter({ text: "Use /redeem to activate your key!" });

      // Send to DM
      try {
        const user = await client.users.fetch(this.user_id);
        if (user) await user.send({ embeds: [embed] });
      } catch (e) {
        console.error(`Failed to DM user ${this.user_id}:`, e.message);
      }

      // Send to Thread
      try {
        const thread = await client.channels.fetch(this.thread_id);
        if (thread) await thread.send({ content: `<@${this.user_id}>`, embeds: [embed] });
      } catch (e) {
        console.error(`Failed to send to thread ${this.thread_id}:`, e.message);
      }

      this.deliveryStatus = "DELIVERED";
      console.log(`[PURCHASE] Delivered ${this.product_type} key to ${this.user_id}`);

    } catch (error) {
      console.error("[PURCHASE] Error during product delivery:", error);
    }
  }

  async sendToMain() {
    // Implement sending funds to main wallet if needed
    return true;
  }
}

/**
 * Add an invoice to the invoicesMap
 */
async function addInvoice(invoice) {
  invoicesMap.set(invoice.invoiceId, invoice);
}

async function startInvoiceChecker(client) {
  console.log("[PURCHASE] Starting automated invoice checker...");
  setInterval(async () => {
    for (const [invoiceId, invoice] of invoicesMap) {
      if (invoice.status === INVOICE_STATUS.PENDING) {
        const confirmed = await invoice.checkForTransactions();
        if (confirmed) {
          await invoice.deliverProduct(client);
        }
      }
      
      // Cleanup expired or closed invoices
      if (invoice.status === INVOICE_STATUS.CLOSED || Date.now() > invoice.availableUntil) {
        invoicesMap.delete(invoiceId);
      }
    }
  }, 30000); // Check every 30 seconds
}

module.exports = {
  Invoice,
  invoicesMap,
  fetchLtcPrice,
  INVOICE_STATUS,
  getAddressFromMnemonic,
  addInvoice,
  startInvoiceChecker
};

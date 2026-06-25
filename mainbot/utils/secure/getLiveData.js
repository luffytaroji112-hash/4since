const axios = require("axios");

module.exports = async function getLiveLoginData() {
    try {
        const res = await axios.get("https://login.live.com", {
            timeout: 15000,
            maxRedirects: 5,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });

        /* ───────────── COOKIES ───────────── */
        const rawCookies = res.headers["set-cookie"] || [];
        const cookies = rawCookies
            .map(c => c.split(";")[0])
            .join("; ");

        /* ───────────── PARSE HTML ───────────── */
        const html = res.data;

        let ppft = null;
        let loginLink = null;

        /* ───────────── PPFT (PRIMARY) ───────────── */
        const serverDataMatch = html.match(/var ServerData = ({.*?});/s);
        if (serverDataMatch) {
            try {
                const serverData = JSON.parse(serverDataMatch[1]);
                const match = serverData?.sFTTag?.match(/value="([^"]+)"/);
                if (match) ppft = match[1];
            } catch (_) {}
        }

        /* ───────────── PPFT (FALLBACK) ───────────── */
        if (!ppft) {
            const ppftMatch = html.match(/name="PPFT"[^>]*value="([^"]+)"/i)
                || html.match(/value="([^"]+)"[^>]*name="PPFT"/i);
            if (ppftMatch) ppft = ppftMatch[1];
        }

        /* ───────────── LOGIN LINK ───────────── */
        const linkRegex =
            /https:\/\/login\.live\.com\/ppsecure\/post\.srf\?[^"'\s]+/i;
        const linkMatch = html.match(linkRegex);
        if (linkMatch) loginLink = linkMatch[0];

        /* ───────────── VALIDATION ───────────── */
        if (!ppft || !loginLink) {
            console.error("[LIVE_LOGIN] Failed to extract PPFT or login link");
            return null;
        }

        return {
            loginLink,
            ppft,
            cookies
        };

    } catch (error) {
        console.error("[LIVE_LOGIN] Request failed:", error.message);
        return null;
    }
};

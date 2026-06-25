const { createCanvas, loadImage, registerFont } = require("canvas");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

/* ───────── FONT SETUP ───────── */
const fontPath = path.join(__dirname, "assets/fonts/minecraftia.ttf");
if (fs.existsSync(fontPath)) {
  registerFont(fontPath, { family: "Minecraftia" });
} else {
  console.warn("[makeCard] Minecraft font missing:", fontPath);
}

/* ───────── RANK COLORS ───────── */
const RANK_COLORS = {
  OWNER: { bracket: "#FFFFFF", rank: "#FFFFFF", glow: "#FFFFFF", plus: "#FFFFFF" },
  ADMIN: { bracket: "#FFFFFF", rank: "#FFFFFF", glow: "#FFFFFF", plus: "#FFFFFF" },
  HELPER: { bracket: "#0000FF", rank: "#0000FF", glow: "#5555FF", plus: "#0000FF" },
  MOD: { bracket: "#00AA00", rank: "#00AA00", glow: "#55FF55", plus: "#00AA00" },
  YOUTUBE: { bracket: "#FF5555", rank: "#FFFFFF", glow: "#AAAAAA", plus: "#FF0000" },
  MVP: { bracket: "#00CCCC", rank: "#00CCCC", glow: "#33FFFF", plus: "#FFD700" },
  MVPPLUS: { bracket: "#00FFFF", rank: "#00FFFF", glow: "#66FFFF", plus: "#FFD700" },
  NONE: { bracket: "#A2A2A2", rank: "#A2A2A2", glow: "#AAAAAA", plus: "#A2A2A2" }
};

/* ───────── UTIL FUNCTIONS ───────── */
function obscureUsername(name) {
  if (!name || name.length < 3) return name;
  return `${name[0]}${"*".repeat(name.length - 2)}${name.at(-1)}`;
}

/* ───────── MAIN IMAGE CREATOR ───────── */
async function makeCard(stats, outputPath = "output.png") {
  const WIDTH = 800;
  const HEIGHT = 450;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  /* ───────── BACKGROUND ───────── */
  try {
    const bgDir = path.join(__dirname, "assets/backgrounds");
    const files = fs.readdirSync(bgDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
    const bg = await loadImage(path.join(bgDir, files[Math.floor(Math.random() * files.length)]));
    ctx.filter = "blur(4px)";
    ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);
    ctx.filter = "none";
  } catch {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  /* ───────── OVERLAY ───────── */
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  /* ───────── AVATAR LOAD ───────── */
  const imageDir = path.join(__dirname, "db/image");
  fs.mkdirSync(imageDir, { recursive: true });

  let avatar;
  const username = stats.username.toLowerCase();
  const avatarPath = path.join(imageDir, `${username}.png`);

  try {
    if (!fs.existsSync(avatarPath)) {
      const url = `https://minotar.net/body/${username}/384`;
      const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
      fs.writeFileSync(avatarPath, res.data);
    }
    avatar = await loadImage(avatarPath);
  } catch {
    const fallback = createCanvas(190, 300);
    const fctx = fallback.getContext("2d");
    fctx.fillStyle = "#444";
    fctx.fillRect(0, 0, 190, 300);
    fctx.fillStyle = "#fff";
    fctx.font = "32px Arial";
    fctx.fillText("?", 85, 160);
    avatar = fallback;
  }

  ctx.drawImage(avatar, 54, 80, 190, 300);

  /* ───────── USERNAME ───────── */
  ctx.font = "24px Minecraftia";
  ctx.fillStyle = "#fff";
  ctx.fillText(obscureUsername(stats.username), 340, 70);

  /* ───────── STATS (LEFT COLUMN) ───────── */
  ctx.font = "16px Minecraftia";
  ctx.fillText(`Networth: ${stats.networth ?? 0}`, 350, 140);
  ctx.fillText(`Bedwars Stars: ${stats.bedwars ?? 0}`, 350, 200);
  ctx.fillText(`Duels KDR: ${stats.duelKDR ?? 0}`, 350, 260);
  ctx.fillText(`SB Level: ${stats.sbLevel ?? 0}`, 350, 320);

  /* ───────── SAVE & RETURN ───────── */
  const buffer = canvas.toBuffer("image/png");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);

  console.log(`[makeCard] Image saved → ${outputPath}`);
  return buffer;
}

module.exports = { makeCard };

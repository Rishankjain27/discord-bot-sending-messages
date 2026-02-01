require("dotenv").config();
const express = require("express");
const session = require("express-session");
const { Client, GatewayIntentBits, EmbedBuilder, ChannelType } = require("discord.js");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* ========== SESSION ========== */
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true, sameSite: "lax" }
  })
);

/* ========== DISCORD CLIENT ========== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let botReady = false;
client.once("ready", () => {
  botReady = true;
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

/* ========== OAUTH ROUTES ========== */
app.get("/auth/login", (req, res) => {
  const redirect = `https://discord.com/oauth2/authorize` +
    `?client_id=${process.env.CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(process.env.BASE_URL + "/auth/callback")}` +
    `&scope=identify guilds`;
  res.redirect(redirect);
});

app.get("/auth/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("No OAuth code");

  const data = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.BASE_URL + "/auth/callback"
  });

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: data
  });

  const token = await tokenRes.json();
  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });

  req.session.user = await userRes.json();
  res.redirect("/");
});

/* ========== OWNER MIDDLEWARE ========== */
const OWNER_ID = process.env.OWNER_ID;
function requireOwner(req, res, next) {
  if (!req.session.user) return res.redirect("/auth/login");
  if (req.session.user.id !== OWNER_ID) return res.status(403).send("⛔ Access denied");
  next();
}

/* ========== API ROUTES ========== */
app.get("/api/guilds", requireOwner, (req, res) => {
  if (!botReady) return res.status(503).json({ error: "Bot not ready" });
  const guilds = client.guilds.cache.map(g => ({ id: g.id, name: g.name }));
  res.json(guilds);
});

app.get("/api/channels/:guildId", requireOwner, async (req, res) => {
  try {
    const guild = await client.guilds.fetch(req.params.guildId);
    await guild.channels.fetch();
    const channels = guild.channels.cache
      .filter(c => c.type === ChannelType.GuildText)
      .map(c => ({ id: c.id, name: c.name }));
    res.json(channels);
  } catch (err) {
    console.error("CHANNEL ERROR:", err);
    res.status(500).json({ error: "Failed to load channels" });
  }
});

app.get("/api/messages/:channelId", requireOwner, async (req, res) => {
  try {
    const channel = await client.channels.fetch(req.params.channelId);
    if (!channel || channel.type !== ChannelType.GuildText)
      return res.status(400).json({ error: "Invalid channel" });

    const messages = await channel.messages.fetch({ limit: 30 });
    res.json(
      [...messages.values()]
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
        .map(m => ({
          author: m.author.username,
          avatar: m.author.displayAvatarURL({ size: 64 }),
          content: m.content,
          time: new Date(m.createdTimestamp).toLocaleTimeString()
        }))
    );
  } catch (err) {
    console.error("MESSAGE FETCH ERROR:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.post("/api/send", requireOwner, async (req, res) => {
  try {
    const { channelId, message, embed, color } = req.body;
    if (!channelId || !message) return res.status(400).json({ error: "Missing data" });

    const channel = await client.channels.fetch(channelId);
    if (!channel || channel.type !== ChannelType.GuildText)
      return res.status(400).json({ error: "Invalid channel" });

    if (embed) {
      const e = new EmbedBuilder()
        .setDescription(message)
        .setColor(color ? parseInt(color.replace("#", ""), 16) : 0x5865f2);
      await channel.send({ embeds: [e] });
    } else {
      await channel.send({ content: message });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("SEND ERROR:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

/* ========== SLASH COMMAND VIEWER ========== */
app.get("/api/slash", requireOwner, async (req, res) => {
  const commands = await client.application.commands.fetch();
  res.json(commands.map(c => ({ name: c.name, description: c.description })));
});

/* ========== START SERVER ========== */
const PORT = process.env.PORT || 3000;
client.login(process.env.BOT_TOKEN);
app.listen(PORT, () => console.log(`🌐 Dashboard running on port ${PORT}`));

require("dotenv").config();
const express = require("express");
const session = require("express-session");
const fetch = require("node-fetch");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ChannelType
} = require("discord.js");

const app = express();

/* ===== SESSION ===== */
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(express.json());
app.use(express.static("public"));

/* ===== DISCORD BOT ===== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

client.once("ready", () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

client.login(process.env.BOT_TOKEN);

/* ===== AUTH MIDDLEWARE ===== */
function authOnly(req, res, next) {
  if (!req.session.user) return res.redirect("/login.html");
  if (req.session.user.id !== process.env.OWNER_ID)
    return res.status(403).send("Access Denied");
  next();
}

/* ===== OAUTH LOGIN ===== */
app.get("/login", (req, res) => {
  const url =
    `https://discord.com/api/oauth2/authorize` +
    `?client_id=${process.env.CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent("http://localhost:3000/auth/callback")}` +
    `&response_type=code` +
    `&scope=identify`;

  res.redirect(url);
});

/* ===== OAUTH CALLBACK ===== */
app.get("/auth/callback", async (req, res) => {
  const code = req.query.code;

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: "http://localhost:3000/auth/callback"
    })
  });

  const token = await tokenRes.json();

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });

  const user = await userRes.json();
  req.session.user = user;

  res.redirect("/");
});

/* ===== LOGOUT ===== */
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login.html"));
});

/* ===== PROTECTED DASHBOARD ===== */
app.get("/", authOnly, (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

/* ===== API (PROTECTED) ===== */
app.get("/api/guilds", authOnly, (req, res) => {
  res.json(client.guilds.cache.map(g => ({
    id: g.id,
    name: g.name
  })));
});

app.get("/api/channels/:guildId", authOnly, async (req, res) => {
  const guild = await client.guilds.fetch(req.params.guildId);
  await guild.channels.fetch();

  res.json(
    guild.channels.cache
      .filter(c => c.type === ChannelType.GuildText)
      .map(c => ({ id: c.id, name: c.name }))
  );
});

app.get("/api/messages/:channelId", authOnly, async (req, res) => {
  const channel = await client.channels.fetch(req.params.channelId);
  const messages = await channel.messages.fetch({ limit: 30 });

  res.json(
    messages
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .map(m => ({
        author: m.author.username,
        avatar: m.author.displayAvatarURL(),
        content: m.content,
        time: new Date(m.createdTimestamp).toLocaleTimeString()
      }))
  );
});

app.post("/api/send", authOnly, async (req, res) => {
  const { channelId, message, embed, color } = req.body;
  const channel = await client.channels.fetch(channelId);

  await channel.send({
    content: embed ? null : message,
    embeds: embed
      ? [new EmbedBuilder().setDescription(message).setColor(color)]
      : [],
    allowedMentions: { parse: ["users", "roles", "everyone"] }
  });

  res.json({ success: true });
});

app.listen(process.env.PORT, () =>
  console.log("Dashboard running")
);

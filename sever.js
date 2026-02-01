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
  secret: process.env.SESSION_SECRET || "secret",
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
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

client.login(process.env.BOT_TOKEN);

/* ===== AUTH MIDDLEWARE ===== */
function authOnly(req, res, next) {
  if (!req.session.user) return res.redirect("/login.html");
  if (req.s

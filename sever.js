require("dotenv").config();
const express = require("express");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ChannelType
} = require("discord.js");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

let botReady = false;

client.once("ready", () => {
  botReady = true;
  console.log(`Bot logged in as ${client.user.tag}`);
});

/* ===== GUILDS ===== */
app.get("/api/guilds", (req, res) => {
  if (!botReady) return res.json([]);
  res.json(client.guilds.cache.map(g => ({
    id: g.id,
    name: g.name
  })));
});

/* ===== CHANNELS ===== */
app.get("/api/channels/:guildId", async (req, res) => {
  const guild = await client.guilds.fetch(req.params.guildId);
  await guild.channels.fetch();

  const channels = guild.channels.cache
    .filter(c => c.type === ChannelType.GuildText)
    .map(c => ({ id: c.id, name: c.name }));

  res.json(channels);
});

/* ===== MESSAGES ===== */
app.get("/api/messages/:channelId", async (req, res) => {
  const channel = await client.channels.fetch(req.params.channelId);
  if (!channel || channel.type !== ChannelType.GuildText) return res.json([]);

  const messages = await channel.messages.fetch({ limit: 30 });

  res.json(
    messages
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .map(m => ({
        author: m.author.username,
        avatar: m.author.displayAvatarURL({ size: 64 }),
        content: m.content || "",
        time: new Date(m.createdTimestamp).toLocaleTimeString(),
        reactions: [...m.reactions.cache.values()].map(r => ({
          emoji: r.emoji.name,
          count: r.count
        }))
      }))
  );
});

/* ===== SEND MESSAGE ===== */
app.post("/api/send", async (req, res) => {
  const { channelId, message, embed, color } = req.body;
  const channel = await client.channels.fetch(channelId);

  if (!channel) return res.sendStatus(400);

  if (embed) {
    const e = new EmbedBuilder()
      .setDescription(message)
      .setColor(parseInt(color.replace("#", ""), 16));

    await channel.send({ embeds: [e] });
  } else {
    await channel.send({ content: message });
  }

  res.json({ success: true });
});

/* ===== SLASH COMMANDS ===== */
app.get("/api/commands", async (req, res) => {
  const cmds = await client.application.commands.fetch();
  res.json(cmds.map(c => ({
    name: c.name,
    description: c.description
  })));
});

client.login(process.env.BOT_TOKEN);

app.listen(process.env.PORT || 3000, () => {
  console.log("Dashboard running");
});

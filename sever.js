require("dotenv").config();
const express = require("express");
const {
  Client,
  GatewayIntentBits,
  ChannelType,
  EmbedBuilder
} = require("discord.js");

const app = express();
const PORT = process.env.PORT || 3000;

/* ================= MIDDLEWARE ================= */

app.use(express.json());
app.use(express.static("public"));

/* ================= DISCORD CLIENT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let botReady = false;

/* ================= BOT READY ================= */

client.once("clientReady", () => {
  botReady = true;
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

/* ================= GET GUILDS ================= */

app.get("/api/guilds", (req, res) => {
  if (!botReady) {
    return res.status(503).json({ error: "Bot not ready" });
  }

  const guilds = client.guilds.cache.map(g => ({
    id: g.id,
    name: g.name
  }));

  res.json(guilds);
});

/* ================= GET CHANNELS ================= */

app.get("/api/channels/:guildId", async (req, res) => {
  try {
    const guild = await client.guilds.fetch(req.params.guildId);
    await guild.channels.fetch();

    const channels = guild.channels.cache
      .filter(c => c.type === ChannelType.GuildText)
      .map(c => ({
        id: c.id,
        name: c.name
      }));

    res.json(channels);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load channels" });
  }
});

/* ================= GET MESSAGES ================= */

app.get("/api/messages/:channelId", async (req, res) => {
  try {
    const channel = await client.channels.fetch(req.params.channelId);

    if (!channel || channel.type !== ChannelType.GuildText) {
      return res.status(400).json({ error: "Invalid channel" });
    }

    const messages = await channel.messages.fetch({ limit: 25 });

    res.json(
      messages
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
        .map(m => ({
          id: m.id,
          author: m.author.username,
          avatar: m.author.displayAvatarURL(),
          content: m.content || "",
          time: new Date(m.createdTimestamp).toLocaleTimeString()
        }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

/* ================= SEND MESSAGE ================= */

app.post("/api/send", async (req, res) => {
  try {
    const { channelId, message, embed, color } = req.body;

    if (!channelId || !message) {
      return res.status(400).json({ error: "Missing data" });
    }

    const channel = await client.channels.fetch(channelId);

    if (embed) {
      const e = new EmbedBuilder()
        .setDescription(message)
        .setColor(
          color ? parseInt(color.replace("#", ""), 16) : 0x5865f2
        );

      await channel.send({ embeds: [e] });
    } else {
      await channel.send({ content: message });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

/* ================= START SERVER ================= */

app.listen(PORT, () => {
  console.log(`🌐 Dashboard running on port ${PORT}`);
});

/* ================= LOGIN ================= */

client.login(process.env.BOT_TOKEN);

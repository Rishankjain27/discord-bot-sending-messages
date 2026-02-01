const guild = document.getElementById("guild");
const channel = document.getElementById("channel");
const chatBox = document.getElementById("chatBox");
const messageInput = document.getElementById("message");
const embedCheckbox = document.getElementById("embed");
const colorInput = document.getElementById("color");

/* ================= LOAD GUILDS ================= */
async function loadGuilds() {
  try {
    const res = await fetch("/api/guilds");
    const data = await res.json();
    guild.innerHTML = "";
    data.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.name;
      guild.appendChild(opt);
    });
    loadChannels();
  } catch (err) {
    console.error("Failed to load guilds", err);
  }
}

/* ================= LOAD CHANNELS ================= */
async function loadChannels() {
  if (!guild.value) return;
  try {
    const res = await fetch(`/api/channels/${guild.value}`);
    const channels = await res.json();
    channel.innerHTML = "";
    channels.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = "#" + c.name;
      channel.appendChild(opt);
    });
    loadMessages();
  } catch (err) {
    console.error("Failed to load channels", err);
  }
}

/* ================= LOAD MESSAGES ================= */
async function loadMessages() {
  if (!channel.value) return;
  try {
    const res = await fetch(`/api/messages/${channel.value}`);
    const messages = await res.json();
    chatBox.innerHTML = "";

    messages.forEach(m => {
      const div = document.createElement("div");
      div.className = "message";
      div.innerHTML = `
        <img src="${m.avatar}" width="32" style="border-radius:50%; vertical-align:middle; margin-right:6px">
        <span class="author">${m.author}</span>
        <span class="time">${m.time}</span><br>
        ${m.content}
      `;
      chatBox.appendChild(div);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  } catch (err) {
    console.error("Failed to load messages", err);
  }
}

/* ================= SEND MESSAGE ================= */
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message || !channel.value) return;

  try {
    await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: channel.value,
        message,
        embed: embedCheckbox.checked,
        color: colorInput.value
      })
    });

    messageInput.value = "";
    setTimeout(loadMessages, 500); // refresh after sending
  } catch (err) {
    console.error("Failed to send message", err);
  }
}

/* ================= EVENT LISTENERS ================= */
guild.addEventListener("change", loadChannels);
channel.addEventListener("change", loadMessages);

/* ================= AUTO REFRESH ================= */
setInterval(() => {
  if (channel.value) loadMessages();
}, 3000); // every 3 seconds

/* ================= INITIAL LOAD ================= */
loadGuilds();

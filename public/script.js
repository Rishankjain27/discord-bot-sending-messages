const guild = document.getElementById("guild");
const channel = document.getElementById("channel");
const chatBox = document.getElementById("chatBox");
const typing = document.getElementById("typing");
const messageInput = document.getElementById("message");

/* ===== LOAD GUILDS ===== */
async function loadGuilds() {
  const res = await fetch("/api/guilds");
  const data = await res.json();

  guild.innerHTML = "";
  data.forEach(g => {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.textContent = g.name;
    guild.appendChild(opt);
  });

  if (data.length) loadChannels();
}

/* ===== LOAD CHANNELS ===== */
async function loadChannels() {
  const res = await fetch(`/api/channels/${guild.value}`);
  const data = await res.json();

  channel.innerHTML = "";
  data.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = "# " + c.name;
    channel.appendChild(opt);
  });

  if (data.length) loadMessages();
}

/* ===== LOAD MESSAGES ===== */
async function loadMessages() {
  const res = await fetch(`/api/messages/${channel.value}`);
  const messages = await res.json();

  chatBox.innerHTML = "";

  messages.forEach(m => {
    const div = document.createElement("div");
    div.className = "message";

    div.innerHTML = `
      <img class="avatar" src="${m.avatar}">
      <div class="msg">
        <div class="author">${m.author}
          <span class="time">${m.time}</span>
        </div>
        <div class="text">${m.content}</div>
        <div class="reactions">
          ${m.reactions.map(r => `${r.emoji} ${r.count}`).join(" ")}
        </div>
      </div>
    `;

    chatBox.appendChild(div);
  });

  chatBox.scrollTop = chatBox.scrollHeight;
}

/* ===== SEND MESSAGE ===== */
async function sendMessage() {
  const message = messageInput.value;
  if (!message.trim()) return;

  await fetch("/api/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channelId: channel.value,
      message,
      embed: document.getElementById("embed").checked,
      color: document.getElementById("color").value
    })
  });

  messageInput.value = "";
  loadMessages();
}

/* ===== TYPING INDICATOR ===== */
let t;
messageInput.addEventListener("input", () => {
  typing.style.display = "block";
  clearTimeout(t);
  t = setTimeout(() => typing.style.display = "none", 1200);
});

/* ===== AUTO REFRESH ===== */
setInterval(() => {
  if (channel.value) loadMessages();
}, 5000);

guild.addEventListener("change", loadChannels);
channel.addEventListener("change", loadMessages);

loadGuilds();

const guild = document.getElementById("guild");
const channel = document.getElementById("channel");
const messageInput = document.getElementById("message");
const embedCheckbox = document.getElementById("embed");
const colorPicker = document.getElementById("color");

/* ================= LOAD GUILDS ================= */

fetch("/api/guilds")
  .then(res => {
    if (!res.ok) window.location.href = "/login";
    return res.json();
  })
  .then(data => {
    guild.innerHTML = "";
    data.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.name;
      guild.appendChild(opt);
    });
    loadChannels();
  });

guild.addEventListener("change", loadChannels);

/* ================= LOAD CHANNELS ================= */

function loadChannels() {
  fetch(`/api/channels/${guild.value}`)
    .then(res => res.json())
    .then(channels => {
      channel.innerHTML = "";
      channels.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = "#" + c.name;
        channel.appendChild(opt);
      });
    });
}

/* ================= SEND MESSAGE ================= */

function sendMessage() {
  fetch("/api/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channelId: channel.value,
      message: messageInput.value,
      embed: embedCheckbox.checked,
      color: colorPicker.value
    })
  })
  .then(res => res.json())
  .then(() => {
    messageInput.value = "";
    alert("Message sent");
  });
}

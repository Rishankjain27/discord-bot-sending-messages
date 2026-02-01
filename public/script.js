// AUTO REFRESH EVERY 3 SECONDS
setInterval(() => { if (channel.value) loadMessages(); }, 3000);

function loadMessages() {
  fetch(`/api/messages/${channel.value}`)
    .then(res => res.json())
    .then(messages => {
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
    });
}

/*
 * 公開ページ側の処理。
 * GAS_WEB_APP_URLには、GASをウェブアプリとしてデプロイしたURLを設定します。
 */
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwIxgS_xCHuHAhg4Zya8Jel-gSDYkHbT34n9DQ-yv76PSx-QRXM5ayYt8tjDX1Xm5-v/exec";

document.getElementById("year").textContent = new Date().getFullYear();

function loadConcerts() {
  if (GAS_WEB_APP_URL.startsWith("ここに")) {
    document.getElementById("concert-list").innerHTML =
      "<p>GASのURLを設定すると、公演情報が表示されます。</p>";
    return;
  }
  const callbackName = "receiveConcerts";
  window[callbackName] = (result) => {
    const list = document.getElementById("concert-list");
    const select = document.getElementById("concert-select");
    list.innerHTML = "";
    select.innerHTML = '<option value="">公演を選択してください</option>';
    if (!result.ok || !result.concerts.length) {
      list.textContent = "現在、受付中のコンサートはありません。";
      return;
    }
    result.concerts.forEach(c => {
      const card = document.createElement("article");
      card.className = "concert-card";
      const date = document.createElement("p");
      date.className = "concert-date";
      date.textContent = `${c.date || ""} ${c.start_time || ""}`;
      const title = document.createElement("h3");
      title.textContent = c.concert_name || "コンサート";
      const venue = document.createElement("p");
      venue.textContent = c.venue || "";
      const description = document.createElement("p");
      description.textContent = c.description || "";
      card.append(date, title, venue, description);
      list.append(card);
      const option = document.createElement("option");
      option.value = c.concert_id;
      option.textContent = `${c.concert_name}（${c.date}）`;
      select.append(option);
    });
  };
  const script = document.createElement("script");
  script.src = `${GAS_WEB_APP_URL}?action=listConcerts&callback=${callbackName}`;
  script.onerror = () => {
    document.getElementById("concert-list").textContent = "公演情報を取得できませんでした。";
  };
  document.body.appendChild(script);
}

function submitToGas(payload, messageElement) {
  if (GAS_WEB_APP_URL.startsWith("ここに")) {
    messageElement.textContent = "先にapp.jsへGASのウェブアプリURLを設定してください。";
    return;
  }
  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  payload.requestId = requestId;
  const form = document.createElement("form");
  form.method = "post";
  form.action = GAS_WEB_APP_URL;
  form.target = "gas-result-frame";
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "payload";
  input.value = JSON.stringify(payload);
  form.appendChild(input);
  document.body.appendChild(form);
  messageElement.textContent = "送信しています…";
  window.addEventListener("message", function handler(event) {
    if (!event.data || event.data.type !== "music-website-result" ||
        event.data.requestId !== requestId) return;
    window.removeEventListener("message", handler);
    messageElement.textContent = event.data.ok ? event.data.message : (event.data.message || "送信に失敗しました。");
    if (event.data.ok) {
      const parentForm = messageElement.closest("form");
      if (parentForm) parentForm.reset();
    }
  });
  form.submit();
  form.remove();
}

document.getElementById("reservation-form").addEventListener("submit", event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  data.action = "reserve";
  data.people = Number(data.people);
  submitToGas(data, document.getElementById("reservation-message"));
});

document.getElementById("contact-form").addEventListener("submit", event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  data.action = "contact";
  submitToGas(data, document.getElementById("contact-message"));
});

loadConcerts();

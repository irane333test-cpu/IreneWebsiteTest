/*
 * 公開ページ側の処理。
 * GAS_WEB_APP_URLには、GASをウェブアプリとしてデプロイしたURLを設定します。
 */
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwIxgS_xCHuHAhg4Zya8Jel-gSDYkHbT34n9DQ-yv76PSx-QRXM5ayYt8tjDX1Xm5-v/exec";


const yearElement = document.getElementById("year");
if(yearElement){
  yearElement.textContent = new Date().getFullYear();
}

function loadTopBackground() {
  // 背景画像を設定する要素を取得
  const topPage = document.body;
  // GASからの応答を受け取る関数
  /*window.receiveTopBackground = (result) => {
    if (!result.ok || !result.imageUrl) {
      console.log("背景画像を取得できませんでした。");
      return;
    }
    // 背景画像を設定
    topPage.style.backgroundImage =`url("${result.imageUrl}")`;
    topPage.style.backgroundSize = "auto 100vh";
    topPage.style.backgroundPosition = "center center";
    topPage.style.backgroundRepeat = "no-repeat";
  };*/

  window.receiveTopBackground = (result) => {
    console.log("GASからの取得結果:", result);
  
    if (!result.ok || !result.imageUrl) {
      console.log("背景画像を取得できませんでした。");
      return;
    }
    topPage.style.backgroundImage =`url("${result.imageUrl}")`;
    topPage.style.backgroundSize = "auto 100vh";
    topPage.style.backgroundPosition = "center center";
    topPage.style.backgroundRepeat = "no-repeat";
  };

  // GASにアクセス
  const script = document.createElement("script");
  script.src =`${GAS_WEB_APP_URL}?action=gettopbackground&callback=receiveTopBackground`;
  script.onerror = () => {console.log("GASへの接続に失敗しました。");};
  document.body.appendChild(script);
}



function loadProfile(){
  const display = document.getElementById("profile-content");

  window.receiveProfile = (result) => {
    if(!result.ok || !result.profiles){
      display.textContent = "取得できませんでした";
      return;
    }

    display.innerHTML = "";
    result.profiles.forEach(profile => {
      const photo = document.createElement("img");
      photo.src = profile.photo_url;
      photo.alt = profile.name;
      photo.className = "profile-photo";
  
      const name = document.createElement("h3");
      name.textContent = profile.name;
  
      const description = document.createElement("p");
      description.textContent = profile.description || "";
      
      const textArea = document.createElement("div");
      textArea.className = "profile-text";
      textArea.append(name, description);
  
      const container = document.createElement("div");
      container.className = "profile-container";
      container.append(photo, textArea);
  
      display.append(container);
    });
  };
  const script = document.createElement("script");
  script.src = `${GAS_WEB_APP_URL}?action=getProfile&callback=receiveProfile`;
  script.onerror = () => {
    display.textContent = "プロフィールを取得できませんでした。";
  };
  document.body.appendChild(script);
}

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

      const reserveButton = document.createElement("a");
      reserveButton.className = "button";
      reserveButton.textContent = "予約する";
      reserveButton.href = `reservation.html?id=${encodeURIComponent(c.concert_id)}`;
      
      card.append(date, title, venue, description, reserveButton);
      list.append(card);
    });
  };
  const script = document.createElement("script");
  script.src = `${GAS_WEB_APP_URL}?action=listConcerts&callback=${callbackName}`;
  script.onerror = () => {
    document.getElementById("concert-list").textContent = "公演情報を取得できませんでした。";
  };
  document.body.appendChild(script);
}

function loadReservationConcert() {
  const params = new URLSearchParams(window.location.search);
  const concertId = params.get("id");

  const display = document.getElementById("selected-concert");

  if(!concertId){
    display.textContent = "公演情報を取得できませんでした。";
    return;
  }

  window.receiveReservationConcert = (result) => {
    if(!result.ok){
      display.textContent = "公演情報を取得できませんでした。";
      return;
    }
    const concert = result.concerts.find(
      c => String(c.concert_id) === concertId
    );

    if(!concert){
      display.textContent = "公演情報を取得できませんでした。";
      return;
    }

    display.innerHTML = "";

    const title = document.createElement("h3");
    title.textContent = concert.concert_name

    const date = document.createElement("p");
    date.textContent = `日時：${concert.date} ${concert.start_time || ""}`;

    const venue = document.createElement("p");
    venue.textContent = `会場：${concert.venue}`;
    
    const price = document.createElement("p");
    price.textContent = `料金：${concert.price}円`;

    display.append(title, date, venue, price);
  };
  
  const script = document.createElement("script");
  script.src = `${GAS_WEB_APP_URL}?action=listConcerts&callback=receiveReservationConcert`;
  script.onerror = () => {
    display.getElementById("concert-list").textContent = "公演情報を取得できませんでした。";
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

const reservationForm = document.getElementById("reservation-form");
if(reservationForm){
  reservationForm.addEventListener("submit", event => {
    event.preventDefault();

    const params = new URLSearchParams(window.location.search);
    const concertId = params.get("id");

    if(!concertId){
      document.getElementById("reservation-message").textContent = "予約する公演が選択されていません。";
      return;
    }
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    data.action = "reserve";
    data.concert_id = concertId;
    data.people = Number(data.people);
    submitToGas(data, document.getElementById("reservation-message"));
  });
}

const contactForm = document.getElementById("contact-form");
if(contactForm){
  contactForm.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    data.action = "contact";
    submitToGas(data, document.getElementById("contact-message"));
  });
}


if (document.body.classList.contains("top-page")) {
  loadTopBackground();
}

if (document.getElementById(".top-page")){
  loadTopBackground();
}

if (document.getElementById("concert-list")){
  loadConcerts();
}

if (document.getElementById("selected-concert")){
  loadReservationConcert();
}

if (document.getElementById("profile-content")){
  loadProfile();
}


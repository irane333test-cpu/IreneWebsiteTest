/**
 * Google Apps Script側の処理
 * スプレッドシートIDはスクリプトプロパティ SPREADSHEET_ID に設定します。
 */
const SHEET_HEADERS = {
  Concert: ["concert_id","concert_name","date","start_time","venue","address","price","capacity","reservation_start","reservation_end","description","status"],
  Reservation: ["reservation_id","concert_id","name","email","phone","people","reservation_date","status"],
  Reception: ["reception_id","reservation_id","concert_id","reception_date","received_people","staff"],
  Inquiry: ["inquiry_id","name","email","message","date","status"],
  Profile: ["name","photo_url","description"]
};

function spreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw new Error("スクリプトプロパティ SPREADSHEET_ID が設定されていません。");
  return SpreadsheetApp.openById(id);
}

function setupSheets() {
  const ss = spreadsheet_();
  Object.keys(SHEET_HEADERS).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, SHEET_HEADERS[name].length).setValues([SHEET_HEADERS[name]]);
      sheet.setFrozenRows(1);
    }
  });
}

function doGet(e) {
  const action = (e.parameter.action || "").toString();
  const callback = (e.parameter.callback || "").toString();
  let result;
  try {
    if (action === "listConcerts") {
      result = { ok: true, concerts: readObjects_("Concert").filter(c => String(c.status).toLowerCase() === "open") };
    } else if(action === "getProfile"){
      const profiles = readObjects_("Profile");
      result = { ok: true, profile : profiles.length > 0 ? profiles[0] : null };
    } else {
      result = { ok: false, message: "不明な操作です。" };
    }
  } catch (err) {
    result = { ok: false, message: err.message };
  }
  const json = JSON.stringify(result);
  if (!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(callback + "(" + json + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
  let payload = {};
  try {
    payload = JSON.parse(e.parameter.payload || "{}");
    let result;
    if (payload.action === "reserve") result = reserve_(payload);
    else if (payload.action === "contact") result = contact_(payload);
    else throw new Error("不明な操作です。");
    return postMessagePage_(payload.requestId, true, result.message);
  } catch (err) {
    return postMessagePage_(payload.requestId || "", false, err.message || "処理に失敗しました。");
  }
}

function postMessagePage_(requestId, ok, message) {
  const data = JSON.stringify({ type: "music-website-result", requestId: requestId, ok: ok, message: message });
  return HtmlService.createHtmlOutput(
    "<!doctype html><html><body><script>window.parent.postMessage(" +
    data + ", '*');</script></body></html>"
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function readObjects_(sheetName) {
  const sheet = spreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map(String);
  return values.filter(row => row.some(v => v !== "")).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      const value = row[i];
      obj[h] = value instanceof Date ? Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd") : value;
    });
    return obj;
  });
}

function reserve_(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = spreadsheet_();
    const concertSheet = ss.getSheetByName("Concert");
    const reservationsSheet = ss.getSheetByName("Reservation");
    const concerts = readObjects_("Concert");
    const concert = concerts.find(c => String(c.concert_id) === String(p.concert_id));
    if (!concert || String(concert.status).toLowerCase() !== "open") throw new Error("この公演は現在予約できません。");
    const people = Number(p.people);
    if (!Number.isInteger(people) || people < 1 || people > 20) throw new Error("予約人数を確認してください。");
    if (!p.name || !p.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) throw new Error("お名前と正しいメールアドレスを入力してください。");

    const reservations = readObjects_("Reservation");
    const reserved = reservations.filter(r => String(r.concert_id) === String(p.concert_id) && String(r.status) === "reserved")
      .reduce((sum, r) => sum + Number(r.people || 0), 0);
    if (reserved + people > Number(concert.capacity)) throw new Error("定員に達したため予約できません。");

    const reservationId = "R" + Utilities.getUuid().replace(/-/g, "").slice(0, 10).toUpperCase();
    reservationsSheet.appendRow([reservationId, p.concert_id, p.name, p.email, p.phone || "", people, new Date(), "reserved"]);

    const subject = "コンサート予約を受け付けました";
    const body = `${p.name} 様\n\nコンサートのご予約を受け付けました。\n予約番号：${reservationId}\n公演名：${concert.concert_name}\n日時：${concert.date} ${concert.start_time}\n会場：${concert.venue}\n予約人数：${people}名\n\nこのメールは自動送信です。`;
    MailApp.sendEmail(p.email, subject, body);
    return { message: "予約を受け付けました。確認メールをご確認ください。予約番号：" + reservationId };
  } finally {
    lock.releaseLock();
  }
}

function contact_(p) {
  if (!p.name || !p.email || !p.message) throw new Error("入力内容を確認してください。");
  const sheet = spreadsheet_().getSheetByName("Inquiry");
  const id = "Q" + Utilities.getUuid().replace(/-/g, "").slice(0, 10).toUpperCase();
  sheet.appendRow([id, p.name, p.email, p.message, new Date(), "new"]);
  const adminEmail = PropertiesService.getScriptProperties().getProperty("ADMIN_EMAIL");
  if (adminEmail) MailApp.sendEmail(adminEmail, "ホームページから問い合わせがありました", `${p.name}\n${p.email}\n\n${p.message}`);
  return { message: "お問い合わせを送信しました。ありがとうございます。" };
}

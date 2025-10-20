// orderRouter.js
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// === Заполнить эти переменные своими ===
const TELEGRAM_TOKEN = "";
const TELEGRAM_CHAT_ID = "";
const PRODUCT_TITLE = "ТОП+ЛОСИНИ";

// Для CRM
const CRM_URL = ""; // https://...lp-crm.biz/import/api/
const CRM_API_KEY = ""; // Твой API-ключ LP-CRM

router.post("/ok", async (req, res) => {
  const {
    name,
    phone,
    comment,
    email,
    product_id,
    product_name,
    delivery,
    delivery_adress,
  } = req.body;
  const utms = req.session && req.session.utms ? req.session.utms : {};
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  if (!name || !phone) {
    return res.status(400).render("fail", {
      message: "Поля 'Ім'я' та 'Телефон' повинні бути заповнені!",
    });
  }

  // ——— LP-CRM ЗАЯВКА ———
  if (CRM_URL && CRM_API_KEY) {
    try {
      const productsList = [
        {
          product_id: product_id || "1",
          price: "555",
          count: "1",
          subs: [
            {
              sub_id: product_id || "1",
              count: "1",
            },
          ],
        },
      ];
      const products = encodeURIComponent(JSON.stringify(productsList));
      const sender = encodeURIComponent(JSON.stringify(req.headers));
      const crmData = {
        key: CRM_API_KEY,
        order_id: Math.round(Date.now() * 10),
        country: "UA",
        office: "1",
        products: products,
        bayer_name: name,
        phone,
        email: email || "",
        comment: product_name || comment || "",
        delivery: delivery || "",
        delivery_adress: delivery_adress || "",
        payment: "",
        sender: sender,
        utm_source: utms.utm_source || "",
        utm_medium: utms.utm_medium || "",
        utm_term: utms.utm_term || "",
        utm_content: utms.utm_content || "",
        utm_campaign: utms.utm_campaign || "",
        additional_1: "",
        additional_2: "",
        additional_3: "",
        additional_4: "",
      };

      await axios.post(CRM_URL, new URLSearchParams(crmData).toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      // игнорируем ответ, можешь обработать если есть желание
    } catch (e) {
      // Можно залогировать ошибку
      console.error("Ошибка отправки в LP-CRM: ", e.message);
    }
  }

  // ——— СПИСОК ДАННЫХ ДЛЯ TELEGRAM ———
  let arr = {
    "<b>→ ЗАМОВЛЕННЯ НА</b>": req.hostname,
    "💁🏻‍♂️ Імʼя: ": name,
    "📱 Телефон: ": phone,
    "📦 Товар: ": PRODUCT_TITLE,
    "🛍️ Колір: ": comment || "",
    "📍 IP: ": ip,
    // '📌 UTM Source: ': utms.utm_source || "",
    // '📌 UTM Medium: ': utms.utm_medium || "",
    // '📌 UTM Term: ': utms.utm_term || "",
    // '📌 UTM Content: ': utms.utm_content || "",
    // '📌 UTM Campaign: ': utms.utm_campaign || "",
  };

  let txt = "";
  Object.entries(arr).forEach(([key, value]) => {
    txt += `<b>${key}</b> ${value}%0A`;
  });

  // ——— TELEGRAM СООБЩЕНИЕ ———
  try {
    await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        params: {
          chat_id: TELEGRAM_CHAT_ID,
          parse_mode: "html",
          text: txt,
        },
      }
    );
  } catch (e) {
    // Можно залогировать ошибку, обработать ее, если надо
    console.error("Ошибка Telegram:", e.message);
  }

  // ——— СОХРАНЕНИЕ ЗАКАЗА В ФАЙЛ (для истории) ———
  const orderData = {
    name,
    phone,
    comment,
    product_id,
    utms,
    ip,
    date: new Date().toISOString(),
  };
  try {
    fs.appendFileSync(
      path.join(__dirname, "/data/orders.txt"),
      JSON.stringify(orderData, null, 2) + ",\n"
    );
  } catch (e) {
    // ошибку тут не рендерим, но можем залогировать
    console.error("Ошибка при сохранении заказа:", e.message);
  }

  // ——— EJS СТРАНИЦА СПАСИБО ———
  res.render("ok", { name: req.body.name, phone: req.body.phone });
});

module.exports = router;

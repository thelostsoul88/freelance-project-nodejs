const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const path = require("path");
const orderRouter = require("./orderRouter");

const app = express();

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "super_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 2592000000 }, // 30 дней
  })
);

// Вьюхи и статика
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(__dirname));

const period_cookie = 2592000; // 30 дней в секундах

app.get("/", (req, res) => {
  [
    "utm_source",
    "utm_medium",
    "utm_term",
    "utm_content",
    "utm_campaign",
  ].forEach((key) => {
    if (req.query[key]) {
      res.cookie(key, req.query[key], {
        maxAge: period_cookie * 1000, // переводим в миллисекунды
      });
    }
  });

  if (!req.session.utms) {
    req.session.utms = {
      utm_source: "",
      utm_medium: "",
      utm_term: "",
      utm_content: "",
      utm_campaign: "",
    };
  }

  // Перенос utm из GET или COOKIE в сессию
  [
    "utm_source",
    "utm_medium",
    "utm_term",
    "utm_content",
    "utm_campaign",
  ].forEach((key) => {
    if (req.query[key]) {
      req.session.utms[key] = req.query[key];
    } else if (req.cookies[key]) {
      req.session.utms[key] = req.cookies[key];
    } else {
      req.session.utms[key] = "";
    }
  });

  // Данные для шаблона
  const price_new = 1399;
  const sale = 50;
  const price_old = Math.floor((price_new / (100 - sale)) * 100);

  res.render("index", {
    sale,
    price_new,
    price_old,
  });
});

// Роуты
app.use("/", orderRouter);

app.listen(3000, () => {
  console.log("Сервер запущен на http://localhost:3000");
});

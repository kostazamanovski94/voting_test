// --- Основно подесување ---
const express = require("express");
const bodyParser = require("body-parser");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

// --- Советници (15 фиксни имиња) ---
const councilors = [
  { id: 1, name: "Коста Замановски" },
  { id: 2, name: "Никола Истолки" },
  { id: 3, name: "Маја Павловска" },
  { id: 4, name: "Зоран Илиевски" },
  { id: 5, name: "Владо Боревски" },
  { id: 6, name: "Епиники Николовска" },
  { id: 7, name: "Жанета Савевска" },
  { id: 8, name: "Јованчо Лазаревски" },
  { id: 9, name: "Ленче Нечовска" },
  { id: 10, name: "Белкас Мустафа" },
  { id: 11, name: "Јулијана Шуминовска" },
  { id: 12, name: "Борче Ристевски" },
  { id: 13, name: "Ајгин Абиши" },
  { id: 14, name: "Блерим Бесими" },
  { id: 15, name: "Аријан" }
];

// --- Точки на дневен ред (динамички) ---
let motions = [];
let votes = {}; // votes[motionId] = [ { councilorId, choice } ]

// --- Админ панел ---
app.get("/admin", (req, res) => {
  res.render("admin", { motions });
});

app.post("/admin/motion", (req, res) => {
  const title = req.body.title;
  const id = motions.length + 1;

  motions.push({ id, title });
  votes[id] = [];

  res.redirect("/admin");
});

// --- Форма за гласање ---
app.get("/vote", (req, res) => {
  res.render("vote", { motions, councilors });
});

app.post("/vote", (req, res) => {
  const { councilorId, motionId, vote } = req.body;

  if (!votes[motionId]) votes[motionId] = [];

  // Бриши стар глас ако постои
  votes[motionId] = votes[motionId].filter(v => v.councilorId != councilorId);

  // Додај нов глас
  votes[motionId].push({
    councilorId: parseInt(councilorId),
    choice: vote
  });

  res.redirect(`/results?motionId=${motionId}`);
});

// --- Резултати за точка ---
app.get("/results", (req, res) => {
  const motionId = req.query.motionId;
  const motion = motions.find(m => m.id == motionId);
  const motionVotes = votes[motionId] || [];

  let counts = { za: 0, protiv: 0, vozdrzan: 0 };
  let detailed = [];

  motionVotes.forEach(entry => {
    const c = councilors.find(c => c.id == entry.councilorId);
    detailed.push({
      name: c.name,
      choice: entry.choice
    });

    if (entry.choice === "За") counts.za++;
    if (entry.choice === "Против") counts.protiv++;
    if (entry.choice === "Воздржан") counts.vozdrzan++;
  });

  res.render("results", {
    motion,
    counts,
    detailed
  });
});

// --- PDF Генератор ---
app.get("/report/:motionId", (req, res) => {
  const motionId = req.params.motionId;
  const motion = motions.find(m => m.id == motionId);
  const motionVotes = votes[motionId] || [];

  if (!motion) return res.send("Нема таква точка!");

  // PDF документ
  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=report_${motionId}.pdf`);
  doc.pipe(res);

  doc.fontSize(20).text(`Извештај за гласање`, { align: "center" });
  doc.moveDown();

  doc.fontSize(14).text(`Точка: ${motion.title}`);
  doc.moveDown();

  let counts = { za: 0, protiv: 0, vozdrzan: 0 };

  motionVotes.forEach(v => {
    if (v.choice === "За") counts.za++;
    else if (v.choice === "Против") counts.protiv++;
    else if (v.choice === "Воздржан") counts.vozdrzan++;
  });

  doc.fontSize(14).text(`Вкупно За: ${counts.za}`);
  doc.text(`Вкупно Против: ${counts.protiv}`);
  doc.text(`Вкупно Воздржани: ${counts.vozdrzan}`);
  doc.moveDown();

  doc.fontSize(16).text("Поединечни гласови:");
  doc.moveDown(0.5);

  motionVotes.forEach(v => {
    const person = councilors.find(c => c.id === v.councilorId);
    doc.fontSize(14).text(`${person.name}: ${v.choice}`);
  });

  doc.end();
});

// --- Старт ---
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Системот за гласање работи на портата: ${PORT}`);
});

// =======================
// RESET SYSTEM (ADMIN)
// =======================
app.get("/reset", (req, res) => {
  votes.length = 0;          // ги брише сите гласови
  motions.length = 0;        // ги брише сите точки
  nextMotionId = 1;          // ресетира ID броење

  res.send(`
    <h2>Системот е ресетиран успешно!</h2>
    <p><a href="/admin">Назад кон админ панел</a></p>
  `);
});


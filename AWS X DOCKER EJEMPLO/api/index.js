
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();
const port = 4000;

// Conexión a MongoDB dentro de Docker
mongoose.connect("mongodb://mongo:27017/monitor_db")
  .then(() => console.log(" Conectado a MongoDB"))
  .catch((err) => console.error(" Error conectando MongoDB:", err));

const Metricas = mongoose.model("Metricas", new mongoose.Schema({
  tipo: String,
  datos: Object,
  tiempo: String
}));

app.use(cors());
app.use(express.json());

app.post("/api/metricas/ram", async (req, res) => {
  const datos = req.body;
  console.log("Datos recibidos RAM:", datos);
  await Metricas.create(datos);
  res.status(200).json({ mensaje: "RAM guardada" });
});

// GET para traer últimas métricas RAM
app.get("/api/metricas/ram", async (req, res) => {
  const metricas = await Metricas.find({ tipo: "RAM" }).sort({ tiempo: -1 }).limit(10);
  res.json(metricas.reverse());
});

app.post("/api/metricas/cpu", async (req, res) => {
  const datos = req.body;
  console.log("Datos recibidos CPU:", datos);
  await Metricas.create(datos);
  res.status(200).json({ mensaje: "CPU guardada" });
});

// GET para traer últimas métricas CPU
app.get("/api/metricas/cpu", async (req, res) => {
  const metricas = await Metricas.find({ tipo: "CPU" }).sort({ tiempo: -1 }).limit(10);
  res.json(metricas.reverse());
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});





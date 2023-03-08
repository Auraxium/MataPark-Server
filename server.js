const express = require("express");
const app = express();
const cors = require("cors");
const axios = require("axios");
const puppeteer = require("puppeteer");
const mongoose = require("mongoose");
const chromium = require("chromium");
var permitModel = mongoose.model(
  "Permit",
  new mongoose.Schema({ license: mongoose.Mixed, expires: mongoose.Mixed })
);
const URI =
  "mongodb+srv://Lemond:z6WKxBTkHFuLUEKi@cluster0.cb5agdt.mongodb.net/?retryWrites=true&w=majority";

let lot_global = [];

parkingUpdate()
let interval = setInterval(parkingUpdate, 9 * 1000 * 60);

let randomArray = [3];

app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: "*",
    headers: "*",
  })
);
app.use(express.json());

mongoose
  .connect(URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("connected to database"))
  .catch((err) => console.log(err));

async function parkingUpdate() {
  try {

    axios
    .post("https://mpwake.onrender.com//req1", {
      value: Math.random() * randomArray[0],
    })
    .then((data) => (randomArray[0] -= Math.random() * data.data["value"]))
    .catch((err) => console.log('err'))
    .finally(() =>  console.log('lot tested'));

    console.log("--------------");
    const browser = await puppeteer.launch({
      executablePath: chromium.path,
      headless: true,
    });
    console.log("launched");
    const page = await browser.newPage();
    console.log("new page");

    await page.goto("https://m.csun.edu/alumni_community/find_parking/index");
    console.log("on page");

    const lots = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll("tr.kgoui_object.kgoui_table_table_row"),
        (e) => ({
          lot: e.querySelector(
            ":first-child div a div .kgo-title :first-child strong"
          ).innerText,
          slots: e.querySelector(
            ":nth-child(2) div a div .kgo-title :first-child span"
          ).innerText,
        })
      )
    );

    console.log("got lots");
    lot_global = lots;

    await browser.close();

    console.log("closed");
		
  } catch (err) {
    console.log(err);
    await browser.close();
  }
}

app.get("/load", (req, res) => {
  permitModel.find().then((arr) => res.json(arr));
});

app.post("/req1", (req, res) => {
  let val = req.body["value"];
  randomArray = [Math.random() * val];
  console.log('test')
  axios
    .post("https://mpserverwake.onrender.com/req1", {
      value: Math.random() * randomArray[0],
    })
    .then((data) => (randomArray[0] -= Math.random() * data.data["value"]))
    .catch((err) => console.log('err'))
    .finally(() =>  console.log('ftest'));

  res.json({ value: Math.random() * randomArray[0] })
});

app.get("/parking-availability", async (req, res) => {
  return res.json(lot_global);
});

app.post("/save", (req, res) => {
  console.log(req.body);
  let permit = new permitModel(req.body);
  console.log(permit);
  permit
    .save()
    .then(() => res.json("Permit added"))
    .catch((err) => res.status(400).json("Error: " + err));
});

app.delete("/delete/:id", (req, res) => {
  console.log("test");
  permitModel
    .findByIdAndDelete(req.params.id)
    .then(() => console.log("deleted permit"))
    .catch((err) => console.log(err));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, null, () => console.log("Running"));

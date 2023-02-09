const express = require("express");
const app = express();
const cors = require("cors");
const puppeteer = require("puppeteer");
const mongoose = require("mongoose");
const Chromium = require("chromium");
var permitModel = mongoose.model(
  "Permit",
  new mongoose.Schema({ license: mongoose.Mixed, expires: mongoose.Mixed })
);
const URI =
  "mongodb+srv://Lemond:z6WKxBTkHFuLUEKi@cluster0.cb5agdt.mongodb.net/?retryWrites=true&w=majority";

//	Chromium.install().then(() => parkingUpdate())
//	parkingUpdate();

//attemps: 2
	 
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

let lot_global = {};

async function parkingUpdate() {
  try {
    console.log("--------------");
    const browser = await puppeteer.launch({
      executablePath: '/opt/render/project/.chrome',
      headless: false
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

parkingUpdate();
let interval = setInterval(parkingUpdate, 9 * 1000 * 60);

app.get("/load", (req, res) => {
  permitModel.find().then((arr) => res.json(arr));
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

app.listen(8080, null, () => console.log("Running"));
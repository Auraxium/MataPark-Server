const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const puppeteer = require('puppeteer')

const mongoose = require("mongoose");
var permitModel = mongoose.model('Permit', new mongoose.Schema({license: mongoose.Mixed, expires: mongoose.Mixed}))
const URI = "mongodb+srv://Lemond:z6WKxBTkHFuLUEKi@cluster0.cb5agdt.mongodb.net/?retryWrites=true&w=majority"

app.use(cors({ 
	origin: "*", 
	credentials: true,
	methods: "*",
	headers: "*"
}));
app.use(express.json());

mongoose.connect(URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,

})
.then(() => console.log("connected to database"))
.catch((err) => console.log(err));

app.get("/load", (req, res) => {
	permitModel.find().then(arr => res.json(arr))
})

app.get("/parking-availability", async (req, res) => {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	await page.goto('https://m.csun.edu/alumni_community/find_parking/index')

	const lots = await page.evaluate(() => 
		Array.from(document.querySelectorAll('tr.kgoui_object.kgoui_table_table_row'), (e) => ({
			lot: e.querySelector(':first-child div a div .kgo-title :first-child strong').innerText,
			slots: e.querySelector(':nth-child(2) div a div .kgo-title :first-child span').innerText
		}))
	)

	console.log(lots);

	await browser.close();

	res.json(lots);
})

app.post("/save", (req, res) => {

	console.log(req.body)

	let permit = new permitModel(req.body);

	console.log(permit) 

	permit.save().then(() => res.json('Permit added'))
  .catch(err => res.status(400).json('Error: ' + err));

});

app.delete("/delete/:id", (req, res) => {
	console.log("test");
	permitModel.findByIdAndDelete(req.params.id).then(() => console.log("deleted permit")).catch((err) => console.log(err))
})

app.listen(8080, null, () => console.log("Running"));

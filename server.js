const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

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
	//res.sendFile(__dirname + "/permits.json")
	permitModel.find().then(arr => res.json(arr))
})

app.post("/save", (req, res) => {
  // fs.writeFile("permits.json", JSON.stringify(req.body), "utf8", (err) => {
  //   if (err) {
  //     console.log(err);
  //     return console.log("ERROR: Failed to save");
  //   }
  // });

	console.log(req.body)

	let permit = new permitModel(req.body);

	console.log(permit) 

	permit.save().then(() => res.json('Permit added'))
  .catch(err => res.status(400).json('Error: ' + err));

 // return res.end("File saved.");
});

app.delete("/delete/:id", (req, res) => {
	console.log("test");
	permitModel.findByIdAndDelete(req.params.id).then(() => console.log("deleted permit")).catch((err) => console.log(err))
})

app.listen(8080, null, () => console.log("Running"));
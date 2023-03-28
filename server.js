const express = require("express");
const app = express();
const cors = require("cors");
const axios = require("axios");
const mongoose = require("mongoose");
const { spawn } = require("child_process");

const permitModel = mongoose.model(
  "Permit",
  new mongoose.Schema({ license: mongoose.Mixed, expires: mongoose.Mixed })
);

let pypath = process.env.PYPATH || './parkingUpdate.py'

const URI =
  "mongodb+srv://Lemond:z6WKxBTkHFuLUEKi@cluster0.cb5agdt.mongodb.net/?retryWrites=true&w=majority";

let park_data = {
  lot: [],
  now: 0
};

parkUpdate();

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

function parkUpdate() {
  const py = spawn("python", [pypath]);
  py.stdout.on("data", (data) => {
    try {
      park_data = JSON.parse(data.toString());
      return park_data;
    } catch (err){
      console.log(err)
      res.status(500).send(err);
    }
  });
}

app.get("/load", (req, res) => {
  permitModel.find().then((arr) => res.json(arr));
});

app.get("/parkmap", (req, res) => {
  if (Date.now() - park_data.now > 300000) 
    parkUpdate()

  res.json(park_data);  
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

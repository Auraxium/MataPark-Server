const express = require("express");
const app = express();
const cors = require("cors");
const axios = require("axios");
const mongoose = require("mongoose");
const { spawn } = require("child_process");
const {google} = require("googleapis")
const fs = require('fs')

const permitModel = mongoose.model(
  "Permit",
  new mongoose.Schema({ license: mongoose.Mixed, expires: mongoose.Mixed })
);

let pypath = process.env.PYPATH || './parkingUpdate.py'
const hostUrl = process.env.HURL || 'http://localhost:8080'
const URI =
  "mongodb+srv://Lemond:z6WKxBTkHFuLUEKi@cluster0.cb5agdt.mongodb.net/?retryWrites=true&w=majority";

let park_data = {
  lot: [],
  now: 0
};

parkUpdate();
console.error('hey doofus')

fs.readdirSync('./').forEach(file => console.log(file));

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
  console.log('its ' + new Date())
  const py = spawn("python", ['../park/parkingUpdate.py']);
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

//#region ----------------GOOGLE--------------------

const googCID =
  "719494722130-n99p2h6d0masuhqijn6u4gdu7174ofir.apps.googleusercontent.com";
const googCS = "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";

let googCache = {};

const GOauth = new google.auth.OAuth2(
  googCID,
  googCS,
   hostUrl+ "/googOauth/callback"
);

app.post("/googOauth", (req, res) => {
  googCache[req.body.uuid] = { origin: req.body.origin };
  const googAuthUrl = GOauth.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    include_granted_scopes: true,
    state: req.body.uuid,
  });
  res.json({ url: googAuthUrl });
});

app.get("/googOauth/callback", async (req, res) => {
  session = req.query.state;
  const response = await GOauth.getToken(req.query.code);
  GOauth.setCredentials({
    access_token: response.tokens.access_token,
    refresh_token: response.tokens.refresh_token,
  });
  let ax = await axios(
    "https://people.googleapis.com/v1/people/me?personFields=names",
    {
      headers: {
        Authorization: `Bearer ${response.tokens.access_token}`,
      },
    }
  );
  googCache[session]["googleId"] = ax.data.names[0].metadata.source.id;
  googCache[session]["username"] = ax.data.names[0].displayName;
  googCache[session]["now"] = Date.now();
  res.redirect(googCache[session]["origin"]);
});

app.post("/googGetToken", (req, res) => {
  let token = googCache[req.body.uuid];
  console.log(token);
  delete googCache[req.body.uuid];
  return res.json(token);
});

//#endregion

const PORT = process.env.PORT || 8080;
app.listen(PORT, null, () => console.log("Running"));

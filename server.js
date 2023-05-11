const express = require("express");
const app = express();
const cors = require("cors");
const axios = require("axios");
const mongoose = require("mongoose");
const { google } = require("googleapis");
const fs = require("fs");

const Schema = mongoose.Schema;

const permitModel = mongoose.model(
  "Permit",
  new mongoose.Schema({ license: mongoose.Mixed, expires: mongoose.Mixed })
);

const userModel = mongoose.model(
  "User",
  new mongoose.Schema({ _id: mongoose.Mixed, data: mongoose.Mixed })
);

const lotStatusSchema = new Schema({
  lotId: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ["Full", "Almost Full", "OK"],
    required: true,
  },
  reportTime: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

const lotStatusModel = mongoose.model("LotStatus", lotStatusSchema);

const hostUrl = process.env.HURL || "http://localhost:8080";
const URI =
  "mongodb+srv://Lemond:z6WKxBTkHFuLUEKi@cluster0.cb5agdt.mongodb.net/matapark?retryWrites=true&w=majority";
console.error(new Date());

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
    dbName: 'matapark',
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then(() => console.log("connected to database"))
  .catch((err) => console.log(err));

app.get("/load", (req, res) => {
  permitModel.find().then((arr) => res.json(arr));
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
    .then(() => console.log("deleted..."))
    .catch((err) => console.log(err));
});

app.get("/loadLotStatus", (req, res) => {
  lotStatusModel.find().then((arr) => res.json(arr));
});

app.post("/saveLotStatus", (req, res) => {
  console.log(req.body);
  let lotStatus = new lotStatusModel(req.body);
  console.log(lotStatus);
  lotStatus
    .save()
    .then(() => res.json("Lot status added"))
    .catch((err) => res.status(400).json("Error: " + err));
});

//#region ----------------GOOGLE--------------------

const googCID =
  "719494722130-1hnnd17h7m5cjsa7st9tlqi9dptdnmmo.apps.googleusercontent.com";
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
  let session = req.query.state;
  const response = await GOauth.getToken(req.query.code);
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

const express = require("express");
const app = express();
const cors = require("cors");
const axios = require("axios");
const mongoose = require("mongoose");
const { google } = require("googleapis");
const fs = require("fs");
const cheerio = require("cheerio");

const Schema = mongoose.Schema;
const permitModel = mongoose.model("Permit", new mongoose.Schema({ license: mongoose.Mixed, expires: mongoose.Mixed }));
const userModel = mongoose.model("User", new mongoose.Schema({ _id: mongoose.Mixed, data: mongoose.Mixed }));
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
const URI = "mongodb+srv://Lemond:z6WKxBTkHFuLUEKi@cluster0.cb5agdt.mongodb.net/matapark?retryWrites=true&w=majority";
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
    dbName: "matapark",
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // useFindAndModify: false,
  })
  .then(() => console.log("connected to database"))
  .catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Database Connected!");
});

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

let parkmap = {
  lots: [],
  date: 0,
};

async function parkingUpdate() {
	let { data } = await axios("https://m.csun.edu/alumni_community/find_parking/index");
  let $ = cheerio.load(data);

  let lots = [];
  $("tr.kgoui_object.kgoui_table_table_row").each((i, e) => {
    let lot = $(e).find(":first-child div a div .kgo-title :first-child strong").text();
    let slots = $(e).find(":nth-child(2) div a div .kgo-title :first-child span").text();
    lots.push({ lot: lot, slots: slots });
  });

	parkmap = { lots: lots, date: Date.now() }
}

app.get("/parkmap", async (req, res) => {
  if(Date.now() - parkmap.date > 300000) 
		await parkingUpdate()
		
  res.json(parkmap);
});

app.delete("/delete/:id", (req, res) => {
  permitModel
    .findByIdAndDelete(req.params.id)
    .then(() => console.log("deleted..."))
    .catch((err) => console.log(err));
});

app.get("/loadLotStatus", (req, res) => {
  lotStatusModel
    .find()
    .then((arr) => res.json(arr))
    .catch((err) => res.json("loadlotstatus didnt work"));
});

app.post("/saveLotStatus", (req, res) => {
  const lotData = req.body;

  // Check if lot with given lotId already exists
  lotStatusModel.findOne({ lotId: lotData.lotId }, (err, lot) => {
    if (err) {
      console.log(err);
      res.status(500).send(err);
    } else {
      if (lot) {
        // If lot exists, update status and reportTime
        lot.status = lotData.status;
        lot.reportTime = lotData.reportTime;
        lot.save((err) => {
          if (err) {
            console.log(err);
            res.status(500).send(err);
          } else {
            console.log(`Updated lot status for lotId ${lotData.lotId}`);
            res.status(200).send(`Updated lot status for lotId ${lotData.lotId}`);
          }
        });
      } else {
        // If lot doesn't exist, create new document
        const newLotStatus = new lotStatusModel(lotData);
        newLotStatus.save((err) => {
          if (err) {
            console.log(err);
            res.status(500).send(err);
          } else {
            console.log(`Saved new lot status for lotId ${lotData.lotId}`);
            res.status(200).send(`Saved new lot status for lotId ${lotData.lotId}`);
          }
        });
      }
    }
  });
});

app.post("/saveData", (req, res) => {
  let data = { _id: req.body._id, data: req.body.data };
  userModel
    .findById(req.body._id)
    .then((user) => {
      if (!user) {
        let init = new userModel(data);
        init.save();
        return res.send("Saved user");
      }
      user.data = data;
      user.save();
      return res.status(200).send("Saved user");
    })
    .catch((err) => res.send(err));
});

app.post("/loadData", (req, res) => {
  // mongoose
});

//#region ----------------GOOGLE--------------------

const googCID = "719494722130-1hnnd17h7m5cjsa7st9tlqi9dptdnmmo.apps.googleusercontent.com";
const googCS = "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";

let googCache = {};

const GOauth = new google.auth.OAuth2(googCID, googCS, hostUrl + "/googOauth/callback");

app.post("/googOauth", (req, res) => {
  googCache[req.body.uuid] = { origin: req.body.origin };
  const googAuthUrl = GOauth.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"],
    include_granted_scopes: true,
    state: req.body.uuid,
  });
  res.json({ url: googAuthUrl });
});

app.get("/googOauth/callback", async (req, res) => {
  let session = req.query.state;
  const response = await GOauth.getToken(req.query.code);
  let ax = await axios("https://people.googleapis.com/v1/people/me?personFields=names", {
    headers: {
      Authorization: `Bearer ${response.tokens.access_token}`,
    },
  });
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

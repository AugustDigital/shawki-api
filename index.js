const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { connection, asDBPromise } = require("./utils");
const { check, validationResult } = require("express-validator");

app.use(express.json());
app.use((_, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
app.get("/", function(req, res) {
  res.json({ data: "api ok" });
});

app.post("/donate", async function(req, res) {
  console.log("/donate");
  const {
    firstname,
    lastname,
    email,
    country,
    donationAmount,
    keepAnonymous
  } = req.body;
  const paymentIntent = await stripe.paymentIntents.create({
    payment_method: req.body.payment_method_id,
    amount: Math.round(parseFloat(donationAmount) * 100),
    currency: "cad"
  });
  console.log("save Donation Data");
  await saveDonationData(firstname, lastname, donationAmount, keepAnonymous);
  try {
    if (
      firstname !== null &&
      lastname != null &&
      email !== null &&
      country != null
    ) {
      console.log("save Petitions Data");
      await asDBPromise(
        connection,
        "INSERT INTO petitions (firstname, lastname, email, country) VALUES (?,?,?,?) ",
        [firstname, lastname, email, country]
      );
    }
  } catch (ex) {
    console.log(ex);
  }
  res.json({ data: paymentIntent });
});

app.post("/confirm", async function(req, res) {
  try {
    const confirmation = await stripe.paymentIntents.confirm(
      req.body.payment_intent_id
    );
    res.json({ data: confirmation });
  } catch (ex) {
    console.log(ex);
    res.json({ data: { status: "failed" } });
  }
});

app.get("/petitions", async function(req, res) {
  try {
    const petitions = await getLastPetitions();
    res.json({ data: petitions });
  } catch (ex) {
    console.trace(ex);
    res.json({ error: true });
  }
});

app.get("/donations", async function(req, res) {
  console.log(req.body);
  try {
    const donations = await getLastDonations();
    res.json({ data: donations });
  } catch (ex) {
    console.trace(ex);
    res.json({ error: true });
  }
});

app.post(
  "/petition",
  [
    check("firstname")
      .isLength({ min: 2, max: 200 })
      .withMessage("Invalid First Name Length")
      .trim()
      .escape()
  ],
  [
    check("lastname")
      .isLength({ min: 2, max: 200 })
      .withMessage("Invalid Last Name Length")
      .trim()
      .escape()
  ],
  [
    check("email")
      .isLength({ min: 2, max: 100 })
      .withMessage("Invalid email address")
      .trim()
      .escape()
  ],
  [
    check("country")
      .isLength({ min: 2, max: 200 })
      .withMessage("Invalid country")
      .trim()
      .escape()
  ],
  async function(req, res) {
    console.log("/petition");
    const { firstname, lastname, email, country } = req.body;
    const errors = validationResult(req);
    let errorsArray = errors.array();

    //return errors if any
    if (!errors.isEmpty() || typeof errorsArray[0] != "undefined") {
      return res.json({ error: errorsArray });
    }
    await asDBPromise(
      connection,
      "INSERT INTO petitions (firstname, lastname, email, country) VALUES (?,?,?,?) ",
      [firstname, lastname, email, country]
    );
    res.json({ success: true });
  }
);

const saveDonationData = async (firstname, lastname, amount, anonymous) => {
  console.log({
    firstname: firstname,
    lastname: lastname,
    amount: amount,
    anonymous: anonymous
  });
  console.log(
    "INSERT INTO donations (firstname, lastname, amount, anonymous) VALUES (?,?,?,?) "
  );
  try {
    await asDBPromise(
      connection,
      "INSERT INTO donations (firstname, lastname, amount, anonymous) VALUES (?,?,?,?) ",
      [firstname, lastname, amount, anonymous]
    );
  } catch (ex) {
    console.log(ex);
  }
};
const getLastPetitions = async () => {
  let petitions = await asDBPromise(
    connection,
    `SELECT * FROM petitions ORDER BY timestamp DESC LIMIT 10;`,
    []
  );
  return petitions;
};
const getLastDonations = async () => {
  let donations = await asDBPromise(
    connection,
    `SELECT * FROM donations ORDER BY timestamp DESC LIMIT 10;`,
    []
  );
  return donations;
};
app.listen(process.env.PORT);

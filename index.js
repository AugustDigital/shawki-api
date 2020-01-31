const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
  console.log(req.body.payment_method_id);
  const paymentIntent = await stripe.paymentIntents.create({
    payment_method: req.body.payment_method_id,
    amount: 1099,
    currency: "cad"
  });
  console.log(paymentIntent);
  res.json({ data: paymentIntent });
});

app.post("/confirm", async function(req, res) {
  console.log(req.body);
  const confirmation = await stripe.paymentIntents.confirm(
    req.body.payment_intent_id
  );
  res.json({ data: confirmation });
});

app.listen(5000);

const express = require("express");

const serverless = require("serverless-http");
 
const app = express();

app.use(express.json());
 
app.get("/api/v1/", (req, res) => {

  res.json({ message: "Running Locally with netlify dev!" });

});
 
app.post("/data", (req, res) => {

  res.json({ received: req.body });

});
 
// Bungkus Express dengan serverless

module.exports.handler = serverless(app);

 
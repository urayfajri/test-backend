const express = require("express");

const serverless = require("serverless-http");

const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(express.json());

// Inisialisasi Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Endpoint GET: Ambil data dari tabel "users"
app.get("/api/v1/items", async (req, res) => {
  const { data, error } = await supabase.from("master_item").select("*");
  if (error) return res.status(400).json({ error: error.message });

  res.json(data);
});
 
app.get("/api/v1/", (req, res) => {

  res.json({ message: "Running Locally with netlify dev!" });

});
 
app.post("/data", (req, res) => {

  res.json({ received: req.body });

});
 
// Bungkus Express dengan serverless
module.exports.handler = serverless(app);

 
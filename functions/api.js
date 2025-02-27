const express = require("express");
const serverless = require("serverless-http");
const { createClient } = require("@supabase/supabase-js");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(express.json());

// Enable CORS for all routes
app.use(cors({
  origin: "*", // Update this to your frontend URL for better security
  credentials: true
}));


// Initialize Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);


// Sign-In Route (Stores Session)
app.post("/api/v1/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ error: error.message });
  }


  res.json({
    status: 200,
    error: null,
    data: {
    ...data.user,
    access_token: data.session.access_token,
  },
  });
});

// ✅ Middleware to Verify JWT Token
const verifySession = async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  // ✅ Verify JWT with Supabase
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }

  req.user = data.user; // ✅ Attach user data to request
  next();
};

// Protected Route
app.get("/api/v1/profile", verifySession, async (req, res) => {
  res.json({ message: "User is authenticated", user: req.user });
});

// Logout Route (Deletes Session)
app.post("/api/v1/signout", verifySession, async (req, res) => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return res.status(500).json({ error: "Failed to sign out" });
  }

  res.json({ message: "User signed out successfully" });
});

// ─── MASTER CUSTOMER CRUD ───
app.get("/api/v1/customers", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 25;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const { count, error: countError } = await supabase
      .from("master_customer")
      .select("*", { count: "exact", head: true });

    if (countError) throw countError;

    const { data, error } = await supabase
      .from("master_customer")
      .select("*")
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const totalPage = Math.ceil(count / limit);

    res.json({
      status: 200,
      error: null,
      data: {
        limit,
        current_page: page,
        total_page: totalPage,
        count: data.length,
        total: count,
        data,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 500,
      error: err.message,
      data: null,
    });
  }
});

app.get("/api/v1/customers/:id", async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("master_customer")
    .select("*")
    .eq("customerid", id)
    .single();

  if (error || !data) {
    return res.status(404).json({
      status: 404,
      error: "Customer not found",
      data: null,
    });
  }

  res.json({
    status: 200,
    error: null,
    data,
  });
});

app.post("/api/v1/customers", async (req, res) => {
  const { custname } = req.body;

  const { data, error } = await supabase
    .from("master_customer")
    .insert([{ custname }])
    .select();

  if (error) {
    return res.status(400).json({
      status: 400,
      error: error.message,
      data: null,
    });
  }

  res.json({
    status: 200,
    error: null,
    data: null,
  });
});

app.put("/api/v1/customers/:id", async (req, res) => {
  const { id } = req.params;
  const { custname } = req.body;

  const { data, error } = await supabase
    .from("master_customer")
    .update({ custname })
    .eq("customerid", id)
    .select();

  if (error) {
    return res.status(400).json({
      status: 400,
      error: error.message,
      data: null,
    });
  }

  res.json({
    status: 200,
    error: null,
    data: data.length > 0 ? data[0] : null,
  });
});


app.delete("/api/v1/customers/:id", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("master_customer")
    .delete()
    .eq("customerid", id);

  if (error) {
    return res.status(400).json({
      status: 400,
      error: error.message,
      data: null,
    });
  }

  res.json({
    status: 200,
    error: null,
    data: null,
  });
});

// ─── MASTER ITEM CRUD ───
app.get("/api/v1/items", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 25;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const { count, error: countError } = await supabase
      .from("master_item")
      .select("*", { count: "exact", head: true });

    if (countError) throw countError;

    const { data, error } = await supabase
      .from("master_item")
      .select("*")
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const totalPage = Math.ceil(count / limit);

    res.json({
      status: 200,
      error: null,
      data: {
        limit,
        current_page: page,
        total_page: totalPage,
        count: data.length,
        total: count,
        data,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 500,
      error: err.message,
      data: null,
    });
  }
});

app.get("/api/v1/items/:id", async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("master_item")
    .select("*")
    .eq("itemid", id)
    .single();

  if (error || !data) {
    return res.status(404).json({
      status: 404,
      error: "Item not found",
      data: null,
    });
  }

  res.json({
    status: 200,
    error: null,
    data,
  });
});

app.post("/api/v1/items", async (req, res) => {
  const { itemname } = req.body;

  const { data, error } = await supabase
    .from("master_item")
    .insert([{ itemname }])
    .select();

  if (error) {
    return res.status(400).json({
      status: 400,
      error: error.message,
      data: null,
    });
  }

  res.json({
    status: 200,
    error: null,
    data: null,
  });
});

app.put("/api/v1/items/:id", async (req, res) => {
  const { id } = req.params;
  const { itemname } = req.body;

  const { data, error } = await supabase
    .from("master_item")
    .update({ itemname })
    .eq("itemid", id)
    .select();

  if (error) {
    return res.status(400).json({
      status: 400,
      error: error.message,
      data: null,
    });
  }

  res.json({
    status: 200,
    error: null,
    data: data.length > 0 ? data[0] : null,
  });
});

app.delete("/api/v1/items/:id", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("master_item")
    .delete()
    .eq("itemid", id);

  if (error) {
    return res.status(400).json({
      status: 400,
      error: error.message,
      data: null,
    });
  }

  res.json({
    status: 200,
    error: null,
    data: null,
  });
});

// ─── SALES HEADER CRUD ───
app.get("/api/v1/sales", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 25;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const { count, error: countError } = await supabase
      .from("sales_header")
      .select("*", { count: "exact", head: true });

    if (countError) throw countError;

    const { data, error } = await supabase
      .from("sales_header")
      .select("*, master_customer(customerid, custname)")
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const transformedData = data.map((item) => ({
      ...item,
      customer: item.master_customer,
    }));

    transformedData.forEach((item) => delete item.master_customer);

    const totalPage = Math.ceil(count / limit);

    res.json({
      status: 200,
      error: null,
      data: {
        limit,
        current_page: page,
        total_page: totalPage,
        count: transformedData.length,
        total: count,
        data: transformedData,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 500,
      error: err.message,
      data: null,
    });
  }
});

app.get("/api/v1/sales/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("sales_header")
      .select(
        "docno, docdate, customerid, master_customer(customerid, custname), sales_detail(*, master_item(itemid, itemname))"
      )
      .eq("docno", id);

    if (error || !data || data.length === 0) {
      return res.status(404).json({
        status: 404,
        error: "Sales record not found",
        data: null,
      });
    }

    const salesData = data[0];

    const transformedData = {
      docno: salesData.docno,
      docdate: salesData.docdate,
      customerid: salesData.customerid,
      customer: salesData.master_customer
        ? {
            customerid: salesData.master_customer.customerid,
            custname: salesData.master_customer.custname,
          }
        : null,
      sales_detail: salesData.sales_detail
        ? salesData.sales_detail.map((detail) => ({
            itemid: detail.master_item ? detail.master_item.itemid : null,
            itemname: detail.master_item ? detail.master_item.itemname : null,
            unitprice: detail.unitprice,
            qty: detail.qty,
          }))
        : [],
    };

    res.json({
      status: 200,
      error: null,
      data: transformedData,
    });
  } catch (err) {
    res.status(500).json({
      status: 500,
      error: err.message,
      data: null,
    });
  }
});

app.post("/api/v1/sales", async (req, res) => {
  const { docdate, customerid, items } = req.body;

  try {
    const { data: salesData, error: salesError } = await supabase
      .from("sales_header")
      .insert([{ docdate, customerid }])
      .select();

    if (salesError) throw salesError;

    const newDocNo = salesData[0].docno;

    if (items && items.length > 0) {
      const salesDetails = items.map((item) => ({
        docno: newDocNo,
        itemid: item.itemid,
        unitprice: item.unitprice,
        qty: item.qty,
      }));

      const { error: detailsError } = await supabase
        .from("sales_detail")
        .insert(salesDetails);

      if (detailsError) throw detailsError;
    }

    res.json({
      status: 200,
      error: null,
      data: {
        docno: newDocNo,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      error: error.message,
      data: null,
    });
  }
});

app.put("/api/v1/sales/:docNo", async (req, res) => {
  const { docNo } = req.params;
  const { docdate, customerid, items } = req.body;

  try {
    const { data: updatedSales, error: salesError } = await supabase
      .from("sales_header")
      .update({ docdate, customerid })
      .eq("docno", docNo)
      .select();

    if (salesError) throw salesError;

    const { error: deleteError } = await supabase
      .from("sales_detail")
      .delete()
      .eq("docno", docNo);

    if (deleteError) throw deleteError;

    if (items && items.length > 0) {
      const salesDetails = items.map((item) => ({
        docno: docNo,
        itemid: item.itemid,
        unitprice: item.unitprice,
        qty: item.qty,
      }));

      const { error: detailsError } = await supabase
        .from("sales_detail")
        .insert(salesDetails);

      if (detailsError) throw detailsError;
    }

    res.json({
      status: 200,
      error: null,
      data: updatedSales.length > 0 ? updatedSales[0] : null,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      error: error.message,
      data: null,
    });
  }
});

app.delete("/api/v1/sales/:docNo", async (req, res) => {
  const { docNo } = req.params;

  const { error } = await supabase
    .from("sales_header")
    .delete()
    .eq("docno", docNo);

  if (error) {
    return res.status(400).json({
      status: 400,
      error: error.message,
      data: null,
    });
  }

  res.json({
    status: 200,
    error: null,
    data: null,
  });
});

// ─── TEST ENDPOINT ───
app.get("/api/v1/", (req, res) => {
  res.json({ message: "Running on Netlify functions with allowed CORS!" });
});

module.exports.handler = serverless(app);

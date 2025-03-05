const express = require("express");
const serverless = require("serverless-http");
const { createClient } = require("@supabase/supabase-js");
const router = express.Router();
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
  res.json({  
    status: 200,
    error: null, 
    data: req.user });
});

// Logout Route (Deletes Session)
app.post("/api/v1/signout", verifySession, async (req, res) => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return res.status(500).json({ error: "Failed to sign out" });
  }

  res.json({ message: "User signed out successfully" });
});

// 📌 API to get total items, total customers, and total sales
app.get('/api/v1/stats/all', async (req, res) => {
  try {
    // Count total customers
    const { count: totalCustomers } = await supabase
      .from('master_customer')
      .select('*', { count: 'exact', head: true });

    // Count total items
    const { count: totalItems } = await supabase
      .from('master_item')
      .select('*', { count: 'exact', head: true });

    // Count total sales
    const { count: totalSales } = await supabase
      .from('sales_detail')
      .select('*', { count: 'exact', head: true });

    // Get total revenue by summing (UnitPrice * Qty)
    const { data: salesData, error: salesError } = await supabase
      .from('sales_detail')
      .select('unitprice, qty');

    if (salesError) throw salesError;

    // Calculate total sales amount
    const totalSalesAmount = salesData.reduce((acc, sale) => {
      return acc + sale.unitprice * sale.qty;
    }, 0);

    res.json({
      status: 200,
      error: null,
      data: {
        total_items: totalItems || 0,
        total_customers: totalCustomers || 0,
        total_sales: {
          count: totalSales || 0,
          total_price: totalSalesAmount || 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 500, 
      error: error.message,
      data: null, 
    });
  }
});

app.get("/api/v1/monthly-sales", async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear(); // Default to current year if not provided

    // Fetch sales data joined with header for filtering by year
    const { data, error } = await supabase
      .from("sales_detail")
      .select("qty, unitprice, sales_header!inner(docdate)")
      .gte("sales_header.docdate", `${year}-01-01`) // Filter by year
      .lte("sales_header.docdate", `${year}-12-31`);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Initialize sales for each month (YYYY-MM)
    const salesByMonth = {};
    for (let month = 1; month <= 12; month++) {
      const monthStr = `${year}-${month.toString().padStart(2, "0")}`; // Format YYYY-MM
      salesByMonth[monthStr] = 0;
    }

    // Aggregate total sales by month
    data.forEach((sale) => {
      const saleDate = sale.sales_header?.docdate;
      if (!saleDate) return;

      const month = saleDate.substring(0, 7); // Extract YYYY-MM
      const totalSale = sale.qty;

      if (salesByMonth.hasOwnProperty(month)) {
        salesByMonth[month] += totalSale;
      }
    });

    // Convert to array format
    const result = Object.keys(salesByMonth).map((month) => ({
      month,
      totalSales: salesByMonth[month],
    }));

    res.json({ 
      status: 200, 
      error: null, 
      data: result 
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

const customersRoutes = require("./modules/customers/customer.api");
const itemsRoutes = require("./modules/items/item.api");
const salesRoutes = require("./modules/sales/sale.api");

// Register Routes
router.use("/customers", customersRoutes);
router.use("/items", itemsRoutes);
router.use("/sales", salesRoutes);

app.use("/api/v1", router);

module.exports.handler = serverless(app);

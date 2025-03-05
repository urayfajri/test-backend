const express = require("express");
const supabase = require("../../services/supabase");

const router = express.Router();

// ─── SALES HEADER CRUD ───
router.get("/", async (req, res) => {
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

router.get("/:id", async (req, res) => {
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

router.post("/", async (req, res) => {
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

router.put("/:docNo", async (req, res) => {
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

router.delete("/:docNo", async (req, res) => {
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

module.exports = router;
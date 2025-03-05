const express = require("express");
const supabase = require("../../services/supabase");

const router = express.Router();

router.get("/", async (req, res) => {
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

router.get("/:id", async (req, res) => {
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

router.post("/", async (req, res) => {
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

router.put("/:id", async (req, res) => {
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

router.delete("/:id", async (req, res) => {
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

module.exports = router;
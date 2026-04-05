import Case from "../models/Case.js";

/* ============================= */
/*   GET ALL CASES               */
/* ============================= */

const getCases = async (req, res, next) => {
  try {
    const { status, sortBy = "priorityScore" } = req.query;

    /* ============================= */
    /* 1️⃣ Build Filter              */
    /* ============================= */

    const filter = {};

    if (status) {
      filter.status = status; // open / closed / under_review
    }

    /* ============================= */
    /* 2️⃣ Fetch Cases               */
    /* ============================= */

    const cases = await Case.find(filter)
      .populate("alerts") // 🔥 include alert details
      .sort({ [sortBy]: -1 }) // default: highest priority first
      .limit(50);

    /* ============================= */
    /* 3️⃣ Response                  */
    /* ============================= */

    return res.status(200).json({
      success: true,
      count: cases.length,
      data: cases,
    });

  } catch (error) {
    console.error("❌ Case Controller Error:", error);
    next(error);
  }
};

export default {
  getCases,
};
import { getNeo4jDriver } from "../config/neo4j.js";
import ScoreHistory from "../models/ScoreHistory.js";

const getAccountProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    /* ============================= */
    /* 1️⃣ Fetch Neo4j Profile       */
    /* ============================= */

    const driver = getNeo4jDriver();
    const session = driver.session();

    let neo4jData = null;

    try {
      const result = await session.run(
        `
        MATCH (a:Account {id: $accountId})
        RETURN 
          a.avg_score_7d AS avg7,
          a.avg_score_30d AS avg30,
          a.peak_score AS peak,
          a.risk_velocity AS velocity,
          a.last_5_scores AS last5
        `,
        { accountId: id }
      );

      if (result.records.length > 0) {
        const record = result.records[0];

        neo4jData = {
          avg7: record.get("avg7") || 0,
          avg30: record.get("avg30") || 0,
          peak: record.get("peak") || 0,
          riskVelocity: record.get("velocity") || 0,
          last5Scores: record.get("last5") || [],
        };
      }
    } finally {
      await session.close();
    }

    /* ============================= */
    /* 2️⃣ Fetch Mongo History       */
    /* ============================= */

    const history = await ScoreHistory.find({ accountId: id })
      .sort({ timestamp: -1 })
      .limit(20);

    /* ============================= */
    /* 3️⃣ Response                  */
    /* ============================= */

    return res.status(200).json({
      success: true,
      data: {
        accountId: id,
        riskProfile: neo4jData,
        recentHistory: history,
      },
    });

  } catch (error) {
    console.error("❌ Account Controller Error:", error);
    next(error);
  }
};

export default {
  getAccountProfile,
};
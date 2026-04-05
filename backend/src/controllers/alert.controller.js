// import Alert from "../models/Alert.js";

// export const getAllAlerts = async (req, res, next) => {
//   try {
//     const { status } = req.query;

//     const filter = status ? { status } : {};

//     const alerts = await Alert.find(filter).sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       count: alerts.length,
//       data: alerts,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// export const updateAlertStatus = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const { status, assignedTo } = req.body;

//     const alert = await Alert.findById(id);

//     if (!alert) {
//       return res.status(404).json({
//         success: false,
//         message: "Alert not found",
//       });
//     }

//     if (status) alert.status = status;
//     if (assignedTo) alert.assignedTo = assignedTo;

//     await alert.save();

//     res.status(200).json({
//       success: true,
//       message: "Alert updated successfully",
//       data: alert,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// import Alert from "../models/Alert.js";

// /* ========================================= */
// /*           GET ALL ALERTS                  */
// /* ========================================= */

// export const getAllAlerts = async (req, res, next) => {
//   try {
//     const { status } = req.query;

//     const filter = status ? { status } : {};

//     const alerts = await Alert.find(filter).sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       count: alerts.length,
//       data: alerts,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /* ========================================= */
// /*         CREATE NEW ALERT (REAL-TIME)      */
// /* ========================================= */

// export const createAlert = async (req, res, next) => {
//   try {
//     const { message, severity, transactionId, userId } = req.body;

//     const newAlert = await Alert.create({
//       message,
//       severity,
//       transactionId,
//       userId,
//       status: "OPEN",
//     });

//     // 🔥 Emit real-time alert
//     const io = req.app.get("io");

//     io.emit("new_alert", newAlert);

//     res.status(201).json({
//       success: true,
//       message: "Alert created successfully",
//       data: newAlert,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /* ========================================= */
// /*         UPDATE ALERT STATUS               */
// /* ========================================= */

// export const updateAlertStatus = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const { status, assignedTo } = req.body;

//     const alert = await Alert.findById(id);

//     if (!alert) {
//       return res.status(404).json({
//         success: false,
//         message: "Alert not found",
//       });
//     }

//     if (status) alert.status = status;
//     if (assignedTo) alert.assignedTo = assignedTo;

//     await alert.save();

//     // 🔥 Emit update event
//     const io = req.app.get("io");

//     io.emit("alert_updated", alert);

//     res.status(200).json({
//       success: true,
//       message: "Alert updated successfully",
//       data: alert,
//     });
//   } catch (error) {
//     next(error);
//   }
// };



import Alert from "../models/Alert.js";

/* ========================================= */
/*           GET ALL ALERTS                  */
/* ========================================= */

export const getAllAlerts = async (req, res, next) => {
  try {
    const { status } = req.query;

    const filter = status ? { status } : {};

    const alerts = await Alert.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    next(error);
  }
};

/* ========================================= */
/*   CREATE ALERT (FIXED TO MATCH SCHEMA)    */
/* ========================================= */

export const createAlert = async (req, res, next) => {
  try {
    const {
      transactionId,
      accountId,
      fraudScore,
      explanation,
      suspiciousPaths,
    } = req.body;

    /* ============================= */
    /* 1️⃣ Validate Required Fields  */
    /* ============================= */

    if (!transactionId || !accountId || typeof fraudScore !== "number") {
      return res.status(400).json({
        success: false,
        message: "transactionId, accountId and fraudScore are required",
      });
    }

    /* ============================= */
    /* 2️⃣ Determine Risk Level      */
    /* ============================= */

    let riskLevel = "low";

    if (fraudScore >= 0.9) riskLevel = "critical";      // ADD this
    else if (fraudScore >= 0.8) riskLevel = "high";
    else if (fraudScore >= 0.5) riskLevel = "medium";

    /* ============================= */
    /* 3️⃣ Create Alert              */
    /* ============================= */

    const newAlert = await Alert.create({
      transactionId,
      accountId,
      fraudScore,
      riskLevel,
      status: "open", // ✅ correct enum
      explanation: explanation || {},
      suspiciousPaths: suspiciousPaths || [],
    });

    /* ============================= */
    /* 4️⃣ Emit real-time alert      */
    /* ============================= */

    const io = req.app.get("io");

    if (io) {
      io.emit("new_alert", newAlert);
    }

    /* ============================= */
    /* 5️⃣ Response                  */
    /* ============================= */

    res.status(201).json({
      success: true,
      message: "Alert created successfully",
      data: newAlert,
    });
  } catch (error) {
    next(error);
  }
};

/* ========================================= */
/*         UPDATE ALERT STATUS               */
/* ========================================= */

export const updateAlertStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, assignedTo, analystDecision } = req.body;

    const alert = await Alert.findById(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    if (status) alert.status = status;
    if (assignedTo) alert.assignedTo = assignedTo;

    if (analystDecision) {
      alert.analystDecision = analystDecision;
      alert.reviewedAt = new Date();
    }

    await alert.save();

    /* 🔥 Emit update */
    const io = req.app.get("io");

    if (io) {
      io.emit("alert_updated", alert);
    }

    res.status(200).json({
      success: true,
      message: "Alert updated successfully",
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};
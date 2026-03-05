import Alert from "../models/Alert.js";

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

export const updateAlertStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, assignedTo } = req.body;

    const alert = await Alert.findById(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    if (status) alert.status = status;
    if (assignedTo) alert.assignedTo = assignedTo;

    await alert.save();

    res.status(200).json({
      success: true,
      message: "Alert updated successfully",
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};
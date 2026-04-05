// backend/src/models/Analyst.js

import mongoose from "mongoose";

const analystSchema = new mongoose.Schema(
  {
    /* ============================= */
    /*         BASIC INFO            */
    /* ============================= */

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    employeeId: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    /* ============================= */
    /*       ACCOUNT STATUS          */
    /* ============================= */

    isActive: {
      type: Boolean,
      default: true,
    },

    /* ============================= */
    /*       ALERT TRACKING          */
    /* ============================= */

    assignedAlerts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Alert",
      },
    ],

    /* ============================= */
    /*     PERFORMANCE METRICS       */
    /* ============================= */

    totalReviewed: {
      type: Number,
      default: 0,
    },

    fraudDetected: {
      type: Number,
      default: 0,
    },

    falsePositives: {
      type: Number,
      default: 0,
    },

    /* ============================= */
    /*       ACTIVITY TRACKING       */
    /* ============================= */

    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* ============================= */
/*          INDEXES              */
/* ============================= */

analystSchema.index({ email: 1 });
analystSchema.index({ employeeId: 1 });

const Analyst = mongoose.model("Analyst", analystSchema);

export default Analyst;
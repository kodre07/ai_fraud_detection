// backend/src/controllers/auth.controller.js

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Analyst from "../models/Analyst.js";

/* ============================= */
/*      GENERATE JWT TOKEN       */
/* ============================= */

const generateToken = (analyst) => {
  return jwt.sign(
    {
      id: analyst._id,
      email: analyst.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

/* ============================= */
/*       REGISTER ANALYST        */
/* ============================= */

export const registerAnalyst = async (req, res, next) => {
  try {
    const { name, email, password, employeeId } = req.body;

    /* ============================= */
    /*         VALIDATION            */
    /* ============================= */

    if (!name || !email || !password || !employeeId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    /* ============================= */
    /*   CHECK IF ALREADY EXISTS     */
    /* ============================= */

    const existingAnalyst = await Analyst.findOne({
      $or: [{ email }, { employeeId }],
    });

    if (existingAnalyst) {
      return res.status(400).json({
        success: false,
        message: "Analyst already exists with email or employeeId",
      });
    }

    /* ============================= */
    /*        HASH PASSWORD          */
    /* ============================= */

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    /* ============================= */
    /*      CREATE ANALYST           */
    /* ============================= */

    const analyst = await Analyst.create({
      name,
      email,
      password: hashedPassword,
      employeeId,
    });

    /* ============================= */
    /*        GENERATE TOKEN         */
    /* ============================= */

    const token = generateToken(analyst);

    /* ============================= */
    /*         RESPONSE              */
    /* ============================= */

    res.status(201).json({
      success: true,
      message: "Analyst registered successfully",
      token,
      data: {
        id: analyst._id,
        name: analyst.name,
        email: analyst.email,
        employeeId: analyst.employeeId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* ============================= */
/*          LOGIN ANALYST        */
/* ============================= */

export const loginAnalyst = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    /* ============================= */
    /*         VALIDATION            */
    /* ============================= */

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    /* ============================= */
    /*      FIND ANALYST             */
    /* ============================= */

    const analyst = await Analyst.findOne({ email });

    if (!analyst) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    /* ============================= */
    /*      CHECK PASSWORD           */
    /* ============================= */

    const isMatch = await bcrypt.compare(password, analyst.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    /* ============================= */
    /*        GENERATE TOKEN         */
    /* ============================= */

    const token = generateToken(analyst);

    /* ============================= */
    /*       UPDATE LAST LOGIN       */
    /* ============================= */

    analyst.lastLogin = new Date();
    await analyst.save();

    /* ============================= */
    /*         RESPONSE              */
    /* ============================= */

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        id: analyst._id,
        name: analyst.name,
        email: analyst.email,
        employeeId: analyst.employeeId,
      },
    });
  } catch (error) {
    next(error);
  }
};
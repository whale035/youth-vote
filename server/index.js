const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");

const app = express();
const PORT = process.env.PORT || 3000;

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "nicholaszobo@gmail.com";
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Youth Vote backend is running"
  });
});

async function sendAdminNotification(subject, html) {
  if (!resend) {
    console.log("Email not configured.");
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject,
    html
  });

  if (error) {
    console.error("Email error:", error);
  }
}

app.post("/submit", async (req, res) => {
  const { type, email, candidate, verified } = req.body;

  const allowedTypes = [
    "introduction",
    "account",
    "verification",
    "vote"
  ];

  if (!allowedTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Invalid submission type"
    });
  }

  const timestamp = new Date().toISOString();

  if (type === "introduction") {
    await sendAdminNotification(
      "Youth Vote - New Session Started",
      `
      <h2>New voting session started</h2>
      <p><strong>Time:</strong> ${timestamp}</p>
      <p>A visitor started the voting process.</p>
      `
    );
  }

  if (type === "account") {
    await sendAdminNotification(
      "Youth Vote - Account Registration",
      `
      <h2>New account registration</h2>
      <p><strong>Email:</strong> ${escapeHtml(email || "")}</p>
      <p><strong>Time:</strong> ${timestamp}</p>
      <p>Password information is intentionally not included.</p>
      `
    );
  }

  if (type === "verification") {
    await sendAdminNotification(
      "Youth Vote - Verification Completed",
      `
      <h2>Verification completed</h2>
      <p><strong>Email:</strong> ${escapeHtml(email || "")}</p>
      <p><strong>Time:</strong> ${timestamp}</p>
      <p>The OTP value itself is not stored or emailed.</p>
      `
    );
  }

  if (type === "vote") {
    await sendAdminNotification(
      "Youth Vote - Vote Received",
      `
      <h2>Vote received</h2>
      <p><strong>Time:</strong> ${timestamp}</p>
      <p>The vote was received successfully.</p>
      <p>The voter's email and candidate selection are not combined in this notification.</p>
      `
    );
  }

  console.log("Youth Vote submission:", {
    type,
    email: typeof email === "string" ? email : null,
    verified: verified === true ? true : null,
    timestamp
  });

  res.json({
    success: true,
    message: "Submission received"
  });
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

app.listen(PORT, () => {
  console.log(`Youth Vote backend running on port ${PORT}`);
});

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

const registrations = [];
const votes = [];
const usedVoteTokens = new Set();

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
    console.error("RESEND_API_KEY is missing");
    return false;
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject,
      html
    });

    console.log("RESEND RESULT:", JSON.stringify(result));

    if (result.error) {
      console.error("RESEND ERROR:", JSON.stringify(result.error));
      return false;
    }

    return true;
  } catch (error) {
    console.error("RESEND EXCEPTION:", error);
    return false;
  }
}

app.post("/submit", async (req, res) => {
  const { type, email, candidate, verified, voteToken } = req.body;

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
    registrations.push({
      email: typeof email === "string" ? email : null,
      timestamp
    });

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
    if (typeof voteToken !== "string" || !voteToken.trim()) {
      return res.status(400).json({
        success: false,
        message: "Voting session token required"
      });
    }

    if (usedVoteTokens.has(voteToken)) {
      return res.status(409).json({
        success: false,
        message: "This voting session has already submitted a vote"
      });
    }

    if (typeof candidate !== "string" || !candidate.trim()) {
      return res.status(400).json({
        success: false,
        message: "Candidate selection required"
      });
    }

    votes.push({
      candidate: candidate.trim(),
      timestamp
    });

    usedVoteTokens.add(voteToken);

    await sendAdminNotification(
      "Youth Vote - Anonymous Vote Received",
      `
      <h2>Anonymous vote received</h2>
      <p><strong>Time:</strong> ${timestamp}</p>
      <p>A vote was recorded without attaching the voter's email to the candidate selection.</p>
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

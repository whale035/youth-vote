const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Youth Vote backend is running"
  });
});

app.post("/submit", (req, res) => {
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

  const submission = {
    type,
    email: typeof email === "string" ? email : null,
    candidate:
      typeof candidate === "string" ? candidate : null,
    verified: verified === true ? true : null,
    timestamp: new Date().toISOString()
  };

  console.log("Youth Vote submission:", submission);

  res.json({
    success: true,
    message: "Submission received"
  });
});

app.listen(PORT, () => {
  console.log(`Youth Vote backend running on port ${PORT}`);
});

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "100kb" }));

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "CampusConnect Web Service is running",
  });
});

// Campus information web service
app.get("/api/campus", (req, res) => {
  res.json({
    success: true,
    message: "Campus information retrieved successfully",
    data: {
      name: "Yaba College of Technology",
      location: "Yaba, Lagos",
      facilities: [
        "Main Gate",
        "Campus Library",
        "ICT Centre",
        "Student Affairs",
      ],
    },
  });
});

// Announcements web service (consumed by app/announcements.js)
app.get("/api/announcements", (req, res) => {
  res.json({
    success: true,
    announcements: [
      {
        id: "1",
        title: "Welcome to CampusConnect",
        body: "Stay updated with the latest campus announcements here.",
        createdAt: new Date().toISOString(),
      },
    ],
  });
});

// Campus updates web service (consumed by app/campus-updates.js
// via getCampusUpdates(), which expects { success, records }).
app.get("/api/updates", (req, res) => {
  res.json({
    success: true,
    records: [
      {
        id: "1",
        title: "Library extended hours",
        body: "The campus library is now open until 10pm on weekdays.",
        createdAt: new Date().toISOString(),
      },
    ],
  });
});

// Feedback POST web service.
// Accepts `feedback` (canonical) or legacy `message` from older clients.
app.post("/api/feedback", (req, res) => {
  const { name, feedback, message } = req.body || {};
  const feedbackText =
    typeof feedback === "string" ? feedback : message;

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Name is required.",
    });
  }

  if (typeof feedbackText !== "string" || !feedbackText.trim()) {
    return res.status(400).json({
      success: false,
      message: "Feedback message is required.",
    });
  }

  if (name.length > 120 || feedbackText.length > 2000) {
    return res.status(400).json({
      success: false,
      message: "Name or feedback is too long.",
    });
  }

  const cleanName = name.trim();
  const cleanFeedback = feedbackText.trim();

  console.log("Feedback received from:", cleanName);

  res.json({
    success: true,
    message: "Feedback received successfully",
    data: {
      name: cleanName,
      feedback: cleanFeedback,
    },
  });
});

// Unknown API routes -> JSON 404 (never an HTML page, so clients
// parsing JSON don't crash on SyntaxError).
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
  });
});

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`CampusConnect Web Service running on port ${PORT}`);
});

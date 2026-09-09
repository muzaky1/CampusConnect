const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

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

// Feedback POST web service
app.post("/api/feedback", (req, res) => {
  const { name, feedback } = req.body;

  console.log("Feedback received:");
  console.log("Name:", name);
  console.log("Feedback:", feedback);

  res.json({
    success: true,
    message: "Feedback received successfully",
    data: {
      name: name,
      feedback: feedback,
    },
  });
});

const PORT = 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`CampusConnect Web Service running on port ${PORT}`);
});
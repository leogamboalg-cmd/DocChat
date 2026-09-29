const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const openai = new OpenAI(); // Reads OPENAI_API_KEY from your environment

app.use(cors());
app.use(express.json());

app.post("/chat", async (req, res) => {
  try {
    const question = req.body.question?.trim();

    if (!question) {
      return res.status(400).json({ error: "Question is required." });
    }

    const response = await openai.responses.create({
      model: "gpt-6-luna",
      input: question,
    });

    res.json({ answer: response.output_text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not get an answer." });
  }
});

app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log("DocChat server running");
});

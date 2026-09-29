const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const openai = new OpenAI(); // Reads OPENAI_API_KEY from Render

app.use(cors());
app.use(express.json({ limit: "8mb" }));

app.post("/chat", async (req, res) => {
  try {
    const question =
      typeof req.body.question === "string" ? req.body.question.trim() : "";

    const image = req.body.image;

    if (!question && !image) {
      return res.status(400).json({
        error: "Add a question or an image.",
      });
    }

    if (
      image &&
      (typeof image !== "string" ||
        !/^data:image\/(png|jpeg|webp|gif);base64,/.test(image))
    ) {
      return res.status(400).json({
        error: "Unsupported image format.",
      });
    }

    const content = [
      {
        type: "input_text",
        text: question || "What is in this image?",
      },
    ];

    if (image) {
      content.push({
        type: "input_image",
        image_url: image,
      });
    }

    const response = await openai.responses.create({
      model: "gpt-6-luna",
      tools: [{ type: "web_search" }],
      input: [
        {
          role: "user",
          content,
        },
      ],
    });

    res.json({
      answer: response.output_text || "No answer was returned.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Could not get an answer.",
    });
  }
});

app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log("DocChat server running");
});

// Add a panel above the Google Docs interface.
const host = document.createElement("div");
host.id = "docchat-root";
host.style.cssText = `
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 2147483647;
`;
document.body.appendChild(host);

// Shadow DOM keeps our styles separate from Google Docs.
const shadow = host.attachShadow({ mode: "open" });

shadow.innerHTML = `
  <style>
    * { box-sizing: border-box; }

    .panel {
      width: 360px;
      max-width: calc(100vw - 32px);
      font: 14px Arial, sans-serif;
      color: #202124;
      background: white;
      border: 1px solid #dadce0;
      border-radius: 14px;
      box-shadow: 0 8px 28px rgba(0, 0, 0, .18);
      overflow: hidden;
    }

    header {
      padding: 12px 16px;
      font-weight: bold;
      border-bottom: 1px solid #eee;
    }

    .messages {
      min-height: 90px;
      max-height: 240px;
      overflow-y: auto;
      padding: 12px 16px;
    }

    .message {
      margin: 0 0 10px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .message strong {
      display: block;
      margin-bottom: 3px;
    }

    form {
      padding: 10px;
      border-top: 1px solid #eee;
    }

    .attachment {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .attachment input {
      max-width: 100%;
      font-size: 12px;
    }

    .row {
      display: flex;
      gap: 8px;
    }

    .question {
      flex: 1;
      min-width: 0;
      padding: 9px;
      border: 1px solid #dadce0;
      border-radius: 8px;
    }

    button {
      padding: 9px 12px;
      border: 0;
      border-radius: 8px;
      color: white;
      background: #2563eb;
      cursor: pointer;
    }

    button:disabled {
      opacity: .6;
      cursor: wait;
    }
  </style>

  <section class="panel" aria-label="DocChat">
    <header>DocChat</header>

    <div class="messages" aria-live="polite">
      <p class="message">Ask a question or attach an image.</p>
    </div>

    <form>
      <div class="attachment">
        <input
          class="image"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          aria-label="Attach an image"
        />
      </div>

      <div class="row">
        <input
          class="question"
          aria-label="Your question"
          placeholder="Ask about this doc or image..."
        />
        <button type="submit">Send</button>
      </div>
    </form>
  </section>
`;

const form = shadow.querySelector("form");
const input = shadow.querySelector(".question");
const imageInput = shadow.querySelector(".image");
const messages = shadow.querySelector(".messages");
const button = shadow.querySelector("button");

function addMessage(sender, text) {
  const message = document.createElement("p");
  message.className = "message";

  const label = document.createElement("strong");
  label.textContent = sender;

  message.append(label, document.createTextNode(text));
  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;
}

// FileReader converts the selected image into a data URL.
function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = input.value.trim();
  const file = imageInput.files[0];

  if (!question && !file) return;

  if (file && file.size > 5 * 1024 * 1024) {
    addMessage("DocChat", "Choose an image smaller than 5 MB.");
    return;
  }

  button.disabled = true;
  button.textContent = "Thinking...";

  try {
    const image = file ? await readImage(file) : null;

    addMessage(
      "You",
      `${question || "What is in this image?"}${file ? `\n📎 ${file.name}` : ""}`,
    );

    const response = await fetch("https://docchat-afym.onrender.com/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: question || "What is in this image?",
        image,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Server error ${response.status}`);
    }

    addMessage("DocChat", data.answer || "No answer was returned.");
    input.value = "";
    imageInput.value = "";
  } catch (error) {
    addMessage("DocChat", `Error: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = "Send";
  }
});

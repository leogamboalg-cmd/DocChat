// Prevent a duplicate panel if the script runs again.
if (!document.getElementById("docchat-root")) {
  const host = document.createElement("div");
  host.id = "docchat-root";
  host.style.cssText = `
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 2147483647;
  `;
  document.body.appendChild(host);

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
        display: flex;
        align-items: center;
        justify-content: space-between;
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

      .clear {
        padding: 5px 8px;
        background: #f1f3f4;
        color: #202124;
        font-size: 12px;
      }
    </style>

    <section class="panel" aria-label="DocChat">
      <header>
        <span>DocChat</span>
        <button class="clear" type="button">Clear</button>
      </header>

      <div class="messages" aria-live="polite"></div>

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
          <button class="send" type="submit">Send</button>
        </div>
      </form>
    </section>
  `;

  const form = shadow.querySelector("form");
  const input = shadow.querySelector(".question");
  const imageInput = shadow.querySelector(".image");
  const messages = shadow.querySelector(".messages");
  const sendButton = shadow.querySelector(".send");
  const clearButton = shadow.querySelector(".clear");

  // The document ID keeps chats from different Docs separate.
  const documentId = location.pathname.match(/\/document\/d\/([^/]+)/)?.[1];
  const storageKey = `docchat:history:${documentId}`;

  let history = [];
  let busy = false;

  function addMessage(sender, text) {
    const message = document.createElement("p");
    message.className = "message";

    const label = document.createElement("strong");
    label.textContent = sender;

    message.append(label, document.createTextNode(text));
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
  }

  function showWelcome() {
    const welcome = document.createElement("p");
    welcome.className = "message";
    welcome.textContent =
      "Ask a question, upload an image, or paste a screenshot.";
    messages.appendChild(welcome);
  }

  function readImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read the image."));
      reader.readAsDataURL(file);
    });
  }

  function setBusy(value) {
    busy = value;
    sendButton.disabled = value;
    clearButton.disabled = value;
    sendButton.textContent = value ? "Thinking..." : "Send";
  }

  async function loadHistory() {
    try {
      const saved = await chrome.storage.local.get(storageKey);
      history = Array.isArray(saved[storageKey]) ? saved[storageKey] : [];

      if (history.length === 0) {
        showWelcome();
      } else {
        for (const entry of history) {
          addMessage(entry.role === "user" ? "You" : "DocChat", entry.text);
        }
      }
    } catch (error) {
      console.error("Could not load DocChat history:", error);
      showWelcome();
    } finally {
      sendButton.disabled = false;
      clearButton.disabled = false;
    }
  }

  // Wait for saved history before accepting a new question.
  sendButton.disabled = true;
  clearButton.disabled = true;
  loadHistory();

  // Pasting text works normally. Pasting an image attaches it.
  shadow.addEventListener("paste", (event) => {
    const image = [...(event.clipboardData?.items || [])]
      .find((item) => item.type.startsWith("image/"))
      ?.getAsFile();

    if (!image) return;

    event.preventDefault();

    const files = new DataTransfer();
    files.items.add(image);
    imageInput.files = files.files;

    addMessage("DocChat", "Image pasted. Add a question or press Send.");
  });

  clearButton.addEventListener("click", async () => {
    if (busy) return;

    try {
      await chrome.storage.local.remove(storageKey);
      history = [];
      messages.replaceChildren();
      showWelcome();
      input.value = "";
      imageInput.value = "";
    } catch (error) {
      addMessage("DocChat", `Could not clear history: ${error.message}`);
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;

    const question = input.value.trim();
    const file = imageInput.files[0];

    if (!question && !file) return;

    if (file && file.size > 5 * 1024 * 1024) {
      addMessage("DocChat", "Choose an image smaller than 5 MB.");
      return;
    }

    setBusy(true);

    try {
      const image = file ? await readImage(file) : null;
      const displayText = question || "Image attached";
      const displayMessage = displayText + (file ? `\n📎 ${file.name}` : "");

      const prompt =
        question ||
        "Look at the attached image. If it contains a clear question or task, " +
          "help with it. Otherwise, briefly describe it and ask what help is wanted.";

      addMessage("You", displayMessage);

      const response = await fetch("https://docchat-afym.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: prompt,
          image,
          history: history.slice(-20),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error ${response.status}`);
      }

      const answer = data.answer || "No answer was returned.";
      addMessage("DocChat", answer);

      // Save text only. Images are sent for this turn but aren't saved locally.
      history.push(
        { role: "user", text: displayMessage },
        { role: "assistant", text: answer },
      );
      history = history.slice(-20);

      await chrome.storage.local.set({ [storageKey]: history });

      input.value = "";
      imageInput.value = "";
    } catch (error) {
      addMessage("DocChat", `Error: ${error.message}`);
    } finally {
      setBusy(false);
    }
  });
}

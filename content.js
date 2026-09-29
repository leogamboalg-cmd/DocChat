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
      display: flex;
      gap: 8px;
      padding: 10px;
      border-top: 1px solid #eee;
    }

    input {
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
  </style>

  <section class="panel" aria-label="DocChat">
    <header>DocChat</header>
    <div class="messages" aria-live="polite">
      <p class="message">Ask a question about this document.</p>
    </div>
    <form>
      <input
        aria-label="Your question"
        placeholder="Ask about this doc..."
        required
      />
      <button type="submit">Send</button>
    </form>
  </section>
`;

const form = shadow.querySelector("form");
const input = shadow.querySelector("input");
const messages = shadow.querySelector(".messages");

function addMessage(sender, text) {
  const message = document.createElement("p");
  message.className = "message";

  const label = document.createElement("strong");
  label.textContent = sender;

  message.append(label, document.createTextNode(text));
  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const question = input.value.trim();
  if (!question) return;

  addMessage("You", question);
  input.value = "";

  addMessage(
    "DocChat",
    "The chat box works! AI and document reading come next.",
  );
});

// Chat UI Helper Module for Metropolis 3D Chat bubbles rendering
// Keeps app.js length strictly under the 500 LOC limit

// Super simple Markdown bold/italic formatter for chatbot displays
export function formatMarkdownHighlights(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.06);padding:2px 4px;border-radius:3px;font-size:11px;">$1</code>')
    .replace(/\n/g, '<br>');
}

export function scrollChatToBottom(container) {
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

export function createTypingBubble() {
  const div = document.createElement('div');
  div.className = 'typing-indicator';
  div.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;
  return div;
}

// Helpers to format bubbles
export function appendMessageBubble(container, role, text) {
  const msg = document.createElement('div');
  msg.className = `chat-msg ${role}`;
  msg.innerHTML = formatMarkdownHighlights(text);
  container.appendChild(msg);
  scrollChatToBottom(container);
}

// Premium Typewriter typing effect for chatbot replies
export function appendTypewriterBubble(container, role, text) {
  const msg = document.createElement('div');
  msg.className = `chat-msg ${role}`;
  container.appendChild(msg);
  scrollChatToBottom(container);

  // Simple typing simulation
  const formattedHtml = formatMarkdownHighlights(text);
  
  let index = 0;
  // Speed parameter: typing 14 characters per step for smooth response speeds
  const step = 14; 
  
  function typeText() {
    if (index < formattedHtml.length) {
      msg.innerHTML = formattedHtml.substring(0, index + step);
      index += step;
      scrollChatToBottom(container);
      setTimeout(typeText, 15);
    } else {
      msg.innerHTML = formattedHtml; // Ensure full final string is loaded
      scrollChatToBottom(container);
    }
  }
  
  typeText();
}

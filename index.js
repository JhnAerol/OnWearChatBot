const _config = {
  openAI_api: "https://alcuino-chatbot.azurewebsites.net/api/OpenAIProxy",
  openAI_model: "gpt-4o-mini",
  ai_instruction: 
  `
  You are OnWear's friendly and knowledgeable Customer Assistant AI.
  You help customers find shoes, t-shirt, caps, answer product questions, give recommendations, and assist with returns or store policies.
  If the customer asks about a specific brand or price, refer to the provided product list.
  Be polite, concise, and professional — use emojis occasionally to sound friendly.
  `,
  response_id: ""
};

const messagesContainer = document.querySelector('.messages-container');
const messageInput = document.getElementById('messageInput');
const sendButton = document.querySelector('.send-button');

let conversationHistory = [];
let productData = [];

async function loadProducts() {
  try {
    const res = await fetch("/data/products.json");
    productData = await res.json();

    const summary = productData
      .map(p => `${p.brand} - ${p.name} (₱${p.price})`)
      .join("; ");

    _config.ai_instruction += 
    `
    Complete product catalog (for reference):
    ${summary}
    `;

    console.log(` Loaded ${productData.length} products for AI context`);
  } catch (err) {
    console.error(" Error loading products:", err);
  }
}

loadProducts();

function getCurrentTime() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
}

function createMessageElement(text, isBot = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isBot ? 'bot-message' : 'user-message'}`;
  
  const avatar = document.createElement('div');
  avatar.className = `avatar ${isBot ? 'bot-avatar' : 'user-avatar'}`;
  const img = document.createElement('img');
  img.src = isBot ? 'images/bot.png' : 'images/user.png';
  img.width = 25;
  avatar.appendChild(img);
  
  const content = document.createElement('div');
  content.className = 'message-content-wrapper';
  
  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${isBot ? 'bot-bubble' : 'user-bubble'}`;
  
  const p = document.createElement('p');
  p.textContent = text;
  bubble.appendChild(p);
  
  const time = document.createElement('span');
  time.className = 'message-time';
  time.textContent = getCurrentTime();
  
  content.appendChild(bubble);
  content.appendChild(time);
  
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(content);
  return messageDiv;
}

function addMessage(text, isBot = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isBot ? 'bot-message' : 'user-message'}`;
  
  const avatar = document.createElement('div');
  avatar.className = `avatar ${isBot ? 'bot-avatar' : 'user-avatar'}`;
  const avatarImg = document.createElement('img');
  avatarImg.src = isBot ? 'images/bot.png' : 'images/user.png';
  avatarImg.width = 25;
  avatar.appendChild(avatarImg);
  
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'message-content-wrapper';
  
  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${isBot ? 'bot-bubble' : 'user-bubble'}`;
  
  const p = document.createElement('p');

  if (isBot) {
    if (Array.isArray(text)) {
      p.innerHTML = text.map((t, i) => `${i + 1}. ${t}`).join('<br>');
    } else if (typeof text === 'string') {
      const formatted = text
        .split('\n')
        .map(line => {
          if (line.trim().startsWith('-')) {
            return `<li>${line.trim().substring(1).trim()}</li>`;
          } else {
            return `<p>${line.trim()}</p>`;
          }
        })
        .join('');
      p.innerHTML = formatted;
    } else {
      p.textContent = String(text);
    }
  } else {
    p.textContent = text;
  }

  bubble.appendChild(p);

  const time = document.createElement('span');
  time.className = 'message-time';
  time.textContent = getCurrentTime();

  contentWrapper.appendChild(bubble);
  contentWrapper.appendChild(time);
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(contentWrapper);
  
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTypingIndicator() {
  const div = document.createElement('div');
  div.id = 'typing-indicator';
  div.className = 'message bot-message';
  div.innerHTML = `
    <div class="avatar bot-avatar"><img src="images/bot.png" width="25"></div>
    <div class="message-content-wrapper">
      <div class="message-bubble bot-bubble"><p>...</p></div>
    </div>
  `;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

async function sendOpenAIRequest(text) {
  conversationHistory.push({ role: "user", content: text });

  if (conversationHistory.length > 10) {
    conversationHistory = conversationHistory.slice(-10);
  }

  const chatContext = conversationHistory
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const body = {
    model: _config.openAI_model,
    input: chatContext,
    instructions: 
    `
    ${_config.ai_instruction}

    If appropriate, reply using bullet points or numbered lists when giving product options, comparisons, or recommendations.
    You may use short paragraphs for explanations or greetings.
    Do not use Markdown — use plain text or HTML tags like <br> or <li>.
    `
  };

  try {
    const response = await fetch(_config.openAI_api, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error("API response not OK");

    const data = await response.json();
    const reply = data.output?.[0]?.content?.[0]?.text || "I'm not sure, but I’ll help you find out!";
    _config.response_id = data.id;

    conversationHistory.push({ role: "assistant", content: reply });
    return reply;
  } catch (err) {
    console.error(" Error:", err);
    return "Sorry , I had a problem responding. Please try again.";
  }
}

async function handleSendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  addMessage(text, false);
  messageInput.value = '';

  showTypingIndicator();
  const reply = await sendOpenAIRequest(text);
  removeTypingIndicator();

  addMessage(reply, true);
}

sendButton.addEventListener('click', handleSendMessage);
messageInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') handleSendMessage();
});

messageInput.focus();

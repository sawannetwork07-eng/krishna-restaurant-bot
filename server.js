const express = require("express");
const app = express();
app.use(express.json());

const CONFIG = {
  VERIFY_TOKEN: "myrestaurant2024",
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN,
  PHONE_NUMBER_ID: process.env.PHONE_NUMBER_ID,
  GROQ_API_KEY: process.env.GROQ_API_KEY,

  RESTAURANT: {
    naam: "Vrindavan Restaurant",
    address: "Runija-Khachrod Road, Bhatpachlana, Maloda, Ujjain, MP - 456313",
    phone: "+91-9303984127",
    website: "vrindavanrestro.in",
    timing: "Roz Subah 11 baje se Raat 11:30 baje tak",
  },

  MENU: {
    "Starters": [
      { naam: "Paneer Tikka", price: 220 },
      { naam: "Veg Spring Roll", price: 160 },
      { naam: "Chicken 65", price: 260 },
    ],
    "Main Course": [
      { naam: "Dal Makhani", price: 180 },
      { naam: "Butter Chicken", price: 320 },
      { naam: "Palak Paneer", price: 220 },
      { naam: "Mutton Rogan Josh", price: 380 },
    ],
    "Breads": [
      { naam: "Butter Naan", price: 45 },
      { naam: "Laccha Paratha", price: 55 },
      { naam: "Tandoori Roti", price: 30 },
    ],
    "Rice": [
      { naam: "Veg Biryani", price: 200 },
      { naam: "Chicken Biryani", price: 280 },
      { naam: "Steamed Rice", price: 80 },
    ],
    "Drinks": [
      { naam: "Lassi", price: 80 },
      { naam: "Masala Chai", price: 30 },
      { naam: "Cold Coffee", price: 120 },
    ],
  },
};

const orders = {};
const sessions = {};
const chatHistory = {};

// ─── GROQ AI ──────────────────────────────────────
async function getAIReply(userMessage, from) {
  try {
    const systemPrompt = `Tu Vrindavan Restaurant ka helpful WhatsApp assistant hai.

Restaurant Info:
- Naam: ${CONFIG.RESTAURANT.naam}
- Address: ${CONFIG.RESTAURANT.address}
- Phone: ${CONFIG.RESTAURANT.phone}
- Website: ${CONFIG.RESTAURANT.website}
- Timing: ${CONFIG.RESTAURANT.timing}

Menu:
Starters: Paneer Tikka Rs.220, Veg Spring Roll Rs.160, Chicken 65 Rs.260
Main Course: Dal Makhani Rs.180, Butter Chicken Rs.320, Palak Paneer Rs.220, Mutton Rogan Josh Rs.380
Breads: Butter Naan Rs.45, Laccha Paratha Rs.55, Tandoori Roti Rs.30
Rice: Veg Biryani Rs.200, Chicken Biryani Rs.280, Steamed Rice Rs.80
Drinks: Lassi Rs.80, Masala Chai Rs.30, Cold Coffee Rs.120

Rules:
- Hindi ya Hinglish mein jawab de
- Short aur helpful jawab de - 2-3 lines maximum
- Agar order karna ho to "order" likhne ko kaho
- Agar table book karni ho to "table" likhne ko kaho
- Menu ke baare mein poochhe to seedha price bata
- Friendly tone rakho`;

    if (!chatHistory[from]) chatHistory[from] = [];

    chatHistory[from].push({
      role: "user",
      content: userMessage
    });

    if (chatHistory[from].length > 10) {
      chatHistory[from] = chatHistory[from].slice(-10);
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CONFIG.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "model": "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory[from]
        ],
        max_tokens: 300,
        temperature: 0.7,
      })
    });

    const data = await response.json();
console.error("Groq Response Status:", response.status);
console.error("Groq Response:", JSON.stringify(data));
    const aiReply = data.choices?.[0]?.message?.content;

    if (aiReply) {
      chatHistory[from].push({
        role: "assistant",
        content: aiReply
      });
      return aiReply;
    }

    return buildMainMenu();

  } catch (err) {
    console.error("AI Error Full:", JSON.stringify(err));
    console.error("AI Error Message:", err.message);
    console.error("GROQ KEY exists:", !!CONFIG.GROQ_API_KEY);
    return buildMainMenu();
  }
}

// ─── WEBHOOK ─────────────────────────────────────
app.get("/webhook", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === CONFIG.VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook", async (req, res) => {
  try {
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return res.sendStatus(200);
    const from = message.from;
    let userText = "";
    if (message.type === "text") userText = message.text.body.trim().toLowerCase();
    const reply = await handleMessage(from, userText);
    if (reply) await sendMessage(from, reply);
  } catch (err) {
    console.error("Error:", err.message);
  }
  res.sendStatus(200);
});

// ─── MESSAGE HANDLER ─────────────────────────────
async function handleMessage(from, text) {
  const state = sessions[from] || "idle";

  // Greetings
  if (["hi","hello","namaste","hey","start",""].includes(text) || text.includes("help")) {
    sessions[from] = "main_menu";
    return buildMainMenu();
  }

  // Menu
  if (text === "1" || text.includes("menu")) {
    sessions[from] = "browsing";
    return buildMenuText();
  }

  // Order start
  if (text === "2" || text.includes("order")) {
    sessions[from] = "ordering";
    orders[from] = { items: "", naam: "", status: "pending" };
    return `ORDER KAREIN\n\nIs format mein likhein:\n\nNaam: Rahul\nOrder: Butter Chicken x2, Naan x3\n\nMenu dekhne ke liye "menu" likhein`;
  }

  // Order confirm
  if (state === "ordering" && text.includes("naam:")) {
    const lines     = text.split("\n").map(l => l.trim());
    const naamLine  = lines.find(l => l.toLowerCase().startsWith("naam:"));
    const orderLine = lines.find(l => l.toLowerCase().startsWith("order:"));
    if (naamLine && orderLine) {
      const naam  = naamLine.split(":")[1].trim();
      const items = orderLine.split(":")[1].trim();
      orders[from] = { naam, items, status: "confirmed" };
      sessions[from] = "idle";
      return `ORDER CONFIRM!\n\nNaam: ${naam}\nItems: ${items}\nTime: 30-45 minutes\nPhone: ${CONFIG.RESTAURANT.phone}\n\nShukriya ${naam} ji!`;
    }
    return `Sahi format mein likhein:\nNaam: Aapka Naam\nOrder: Item x quantity`;
  }

  // Table booking
  if (text === "3" || text.includes("table") || text.includes("book")) {
    sessions[from] = "booking";
    return `TABLE BOOKING\n\nIs format mein likhein:\nTarikh: DD/MM/YYYY\nSamay: HH:MM AM/PM\nLog: Kitne log\nNaam: Aapka Naam`;
  }

  if (state === "booking" && text.includes("tarikh:")) {
    sessions[from] = "idle";
    return `BOOKING REQUEST MILI!\n\nHumari team jald confirm karegi.\nPhone: ${CONFIG.RESTAURANT.phone}\n\nDhanyavaad!`;
  }

  // Timing
  if (text === "4" || text.includes("time") || text.includes("timing")) {
    return `HUMARA SAMAY\n\n${CONFIG.RESTAURANT.timing}\n\nPhone: ${CONFIG.RESTAURANT.phone}`;
  }

  // Location
  if (text === "5" || text.includes("location") || text.includes("address") || text.includes("kahan")) {
    return `HAMARA PATA\n\n${CONFIG.RESTAURANT.address}\nPhone: ${CONFIG.RESTAURANT.phone}\nWebsite: ${CONFIG.RESTAURANT.website}`;
  }

  // Order status
  if (text.includes("status")) {
    const o = orders[from];
    if (o) return `ORDER STATUS\n\nNaam: ${o.naam}\nItems: ${o.items}\nStatus: ${o.status.toUpperCase()}`;
    return `Koi active order nahi. Order ke liye "order" likhein.`;
  }

  // AI handle karega baaki sab
  return await getAIReply(text, from);
}

// ─── HELPERS ─────────────────────────────────────
function buildMainMenu() {
  return `Namaste! ${CONFIG.RESTAURANT.naam} mein Swagat hai!\n\nKya chahiye?\n\n1 - Menu dekhein\n2 - Order karein\n3 - Table book karein\n4 - Khulne ka samay\n5 - Hamara pata\n\nWebsite: ${CONFIG.RESTAURANT.website}`;
}

function buildMenuText() {
  let text = `${CONFIG.RESTAURANT.naam} MENU\n\n`;
  for (const [cat, items] of Object.entries(CONFIG.MENU)) {
    text += `${cat}\n`;
    items.forEach(i => { text += `  ${i.naam} - Rs.${i.price}\n`; });
    text += "\n";
  }
  text += `Order ke liye: "order" likhein\nPhone: ${CONFIG.RESTAURANT.phone}`;
  return text;
}

async function sendMessage(to, body) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${CONFIG.PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CONFIG.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body, preview_url: false },
    }),
  });
  const data = await res.json();
  if (!res.ok) console.error("Send error:", JSON.stringify(data));
}

app.get("/", (req, res) => {
  res.json({ status: "Vrindavan Restaurant Bot chal raha hai!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Vrindavan Restaurant Bot — Port ${PORT}`));

const express = require("express");
const app = express();
app.use(express.json());

const CONFIG = {
  VERIFY_TOKEN: "myrestaurant2024",
  WHATSAPP_TOKEN: "EAAjnwOs4RTkBRRZAVRIu7RZAgPFW1t8ig1IMR4OC386lQC5PKM8DMItybzU4dU5ZAyRNR5KTjip5yxROcmptQ0Pz5IdGZCxZAUgvCOOSE0kSZAFBzxZAw5OkgUcm1ZCLC7Bau4JAaX1NZB8I34ksLa2DejMq4MpMhib8un3IegEZCCCN7TayTr5g7x7dFz1UJtMdCuZABLE3pUiPGwA2J7W5nadZBiX0SUkLg8SxS3ZA4XiMPaKdE7pQ2kAZDZD",
  PHONE_NUMBER_ID: "1093322707193885",

  RESTAURANT: {
    naam: "Vrindavan Restaurant",
    address: "Runija-Khachrod Road, Bhatpachlana, Maloda, Ujjain, MP - 456313",
    phone: "+91-9303984127",
    website: "vrindavanrestro.in",
    timing: {
      weekday: "Somvar–Shanivaar: Subah 11 baje – Raat 11:30 baje",
      weekend: "Ravivaar: Subah 11 baje – Raat 11:30 baje",
    },
  },

  MENU: {
    "🥗 Starters": [
      { naam: "Paneer Tikka",     price: 220 },
      { naam: "Veg Spring Roll",  price: 160 },
      { naam: "Chicken 65",       price: 260 },
    ],
    "🍛 Main Course": [
      { naam: "Dal Makhani",       price: 180 },
      { naam: "Butter Chicken",    price: 320 },
      { naam: "Palak Paneer",      price: 220 },
      { naam: "Mutton Rogan Josh", price: 380 },
    ],
    "🍞 Breads": [
      { naam: "Butter Naan",    price: 45 },
      { naam: "Laccha Paratha", price: 55 },
      { naam: "Tandoori Roti",  price: 30 },
    ],
    "🍚 Rice": [
      { naam: "Veg Biryani",     price: 200 },
      { naam: "Chicken Biryani", price: 280 },
      { naam: "Steamed Rice",    price: 80 },
    ],
    "🥤 Drinks": [
      { naam: "Lassi",       price: 80 },
      { naam: "Masala Chai", price: 30 },
      { naam: "Cold Coffee", price: 120 },
    ],
  },
};

const orders   = {};
const sessions = {};

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

async function handleMessage(from, text) {
  const state = sessions[from] || "idle";

  if (["hi","hello","namaste","hey","start",""].includes(text) || text.includes("help")) {
    sessions[from] = "main_menu";
    return buildMainMenu();
  }
  if (text === "1" || text.includes("menu")) {
    sessions[from] = "browsing";
    return buildMenuText();
  }
  if (text === "2" || text.includes("order")) {
    sessions[from] = "ordering";
    orders[from] = { items: "", naam: "", status: "pending" };
    return `🛒 *ORDER KAREIN*\n\nIs format mein likhein:\n\n*Naam: Rahul*\n*Order: Butter Chicken x2, Naan x3*\n\nMenu dekhne ke liye *menu* likhein 📋`;
  }
  if (state === "ordering" && text.includes("naam:")) {
    const lines     = text.split("\n").map(l => l.trim());
    const naamLine  = lines.find(l => l.toLowerCase().startsWith("naam:"));
    const orderLine = lines.find(l => l.toLowerCase().startsWith("order:"));
    if (naamLine && orderLine) {
      const naam  = naamLine.split(":")[1].trim();
      const items = orderLine.split(":")[1].trim();
      orders[from] = { naam, items, status: "confirmed" };
      sessions[from] = "idle";
      return `✅ *ORDER CONFIRM!*\n\n👤 Naam: *${naam}*\n📦 Items: ${items}\n⏱️ Time: 30-45 minutes\n📞 ${CONFIG.RESTAURANT.phone}\n\nShukriya ${naam} ji! 🙏`;
    }
    return `⚠️ Sahi format mein likhein:\n*Naam: Aapka Naam*\n*Order: Item x quantity*`;
  }
  if (text === "3" || text.includes("table") || text.includes("book")) {
    sessions[from] = "booking";
    return `📅 *TABLE BOOKING*\n\nIs format mein likhein:\n*Tarikh: DD/MM/YYYY*\n*Samay: HH:MM AM/PM*\n*Log: Kitne log*\n*Naam: Aapka Naam*`;
  }
  if (state === "booking" && text.includes("tarikh:")) {
    sessions[from] = "idle";
    return `✅ *BOOKING REQUEST MILI!*\n\nHumari team jald confirm karegi.\n📞 ${CONFIG.RESTAURANT.phone}\n\nDhanyavaad! 🙏`;
  }
  if (text === "4" || text.includes("time") || text.includes("timing")) {
    return `⏰ *HUMARA SAMAY*\n\n📅 ${CONFIG.RESTAURANT.timing.weekday}\n📅 ${CONFIG.RESTAURANT.timing.weekend}\n\n📞 ${CONFIG.RESTAURANT.phone}`;
  }
  if (text === "5" || text.includes("location") || text.includes("address") || text.includes("kahan")) {
    return `📍 *HAMARA PATA*\n\n🏠 ${CONFIG.RESTAURANT.address}\n📞 ${CONFIG.RESTAURANT.phone}\n🌐 ${CONFIG.RESTAURANT.website}\n\nGoogle Maps:\nhttps://maps.google.com/?q=Vrindavan+Restaurant+Maloda+Ujjain`;
  }
  if (text.includes("status")) {
    const o = orders[from];
    if (o) return `📦 *ORDER STATUS*\n\nNaam: ${o.naam}\nItems: ${o.items}\nStatus: ✅ ${o.status.toUpperCase()}`;
    return `❓ Koi active order nahi. Order ke liye *order* likhein.`;
  }

  sessions[from] = "idle";
  return buildMainMenu();
}

function buildMainMenu() {
  return `🙏 *Namaste! ${CONFIG.RESTAURANT.naam} mein Swagat hai!*\n\nKya chahiye?\n\n1️⃣ *menu*     — Menu dekhein\n2️⃣ *order*    — Order karein\n3️⃣ *table*    — Table book karein\n4️⃣ *timing*   — Khulne ka samay\n5️⃣ *location* — Hamara pata\n\n🌐 ${CONFIG.RESTAURANT.website}`;
}

function buildMenuText() {
  let text = `📋 *${CONFIG.RESTAURANT.naam} — MENU*\n${"─".repeat(28)}\n\n`;
  for (const [cat, items] of Object.entries(CONFIG.MENU)) {
    text += `*${cat}*\n`;
    items.forEach(i => { text += `  • ${i.naam}  —  ₹${i.price}\n`; });
    text += "\n";
  }
  text += `${"─".repeat(28)}\n🛒 Order: *order* likhein\n📞 ${CONFIG.RESTAURANT.phone}`;
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
  res.json({ status: "🟢 Vrindavan Restaurant Bot chal raha hai!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🍽️ Vrindavan Restaurant Bot — Port ${PORT}`));

const express = require("express");
const app = express();
app.use(express.json());

const CONFIG = {
  VERIFY_TOKEN:    process.env.VERIFY_TOKEN,
  WHATSAPP_TOKEN:  process.env.WHATSAPP_TOKEN,
  PHONE_NUMBER_ID: process.env.PHONE_NUMBER_ID,

  RESTAURANT: {
    naam:    "Vrindavan Restaurant",
    address: "Runija-Khachrod Road, Bhatpachlana, Maloda, Ujjain, MP - 456313",
    phone:   "+91-9303984127",
    website: "vrindavanrestro.in",
    maps:    "https://maps.google.com/?q=Vrindavan+Restaurant+Maloda+Ujjain",
    timing:  "Roz Subah 11:00 baje se Raat 11:30 baje tak",
  },

  IMAGES: {
    welcome:  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
    menu:     "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800",
    order:    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
    location: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
  },

  MENU: {
    "⭐ Best Sellers": [
      { id:"BS01", naam:"Paneer Angara",         price:250, desc:"Smoky & spicy paneer — bestseller! 🔥" },
      { id:"BS02", naam:"Kaju Curry",             price:190, desc:"Rich creamy cashew gravy 😍"           },
      { id:"BS03", naam:"Dal Tadka",              price:130, desc:"Ghar jaisa swad, roz ka favorite 💛"   },
      { id:"BS04", naam:"Jeera Rice",             price:110, desc:"Fluffy jeera rice, perfect combo 🍚"   },
      { id:"BS05", naam:"Butter Laccha Paratha",  price:45,  desc:"Crispy layers with makkhan 🧈"         },
      { id:"BS06", naam:"Boondi Raita",           price:65,  desc:"Thanda thanda refreshing raita 🥣"     },
      { id:"BS07", naam:"Makka Roti",             price:40,  desc:"Desi makka roti, pure desi taste 🌽"   },
      { id:"BS08", naam:"Butter Roti",            price:18,  desc:"Soft roti with butter 🧈"              },
      { id:"BS09", naam:"Plain Roti",             price:15,  desc:"Simple & healthy 🫓"                   },
      { id:"BS10", naam:"Butter Milk",            price:25,  desc:"Thandi chhaach, desi cool drink 🥛"    },
      { id:"BS11", naam:"Butter Tikki Amul",      price:25,  desc:"Amul butter wali crispy tikki 🧈"      },
      { id:"BS12", naam:"Cone Butter Skoch",      price:30,  desc:"Butterscotch ice cream cone 🍦"        },
      { id:"BS13", naam:"Fry Papad",              price:25,  desc:"Crispy fried papad 🥮"                 },
      { id:"BS14", naam:"Masala Papad",           price:30,  desc:"Tangy masala papad 🌶️"                },
      { id:"BS15", naam:"Roasted Papad",          price:20,  desc:"Light roasted papad 🥮"                },
      { id:"BS16", naam:"Minral Water",           price:20,  desc:"Fresh mineral water 💧"                },
    ],
    "🍽️ Special Items": [
      { id:"SP01", naam:"Vrindavan Spl Pizza",    price:199, desc:"Hamaari signature special pizza 🍕"    },
      { id:"SP02", naam:"Paneer Chilly Dry",      price:199, desc:"Spicy indo-chinese paneer 🌶️"         },
      { id:"SP03", naam:"Manchurian Dry",         price:135, desc:"Crispy manchurian balls 🥢"            },
      { id:"SP04", naam:"Veg Hakka Noodles",      price:125, desc:"Stir-fried hakka noodles 🍜"           },
      { id:"SP05", naam:"Alfredo Sauce Pasta",    price:110, desc:"Creamy white sauce pasta 🍝"           },
      { id:"SP06", naam:"Masala Sandwich",        price:99,  desc:"Spicy grilled sandwich 🥪"             },
      { id:"SP07", naam:"Soft Drink",             price:20,  desc:"Chilled cold drink 🥤"                 },
      { id:"SP08", naam:"Choco Chips Icecream",   price:30,  desc:"Chocolate chip ice cream 🍫🍦"         },
    ],
  },
};

const sessions = {};
function getSession(from) {
  if (!sessions[from]) {
    sessions[from] = { step:"idle", cart:[], naam:"", address:"", orderType:"", booking:{}, _ordering:false, _currentCat:"", _bookingFlow:false };
  }
  return sessions[from];
}
function resetSession(from) {
  sessions[from] = { step:"idle", cart:[], naam:"", address:"", orderType:"", booking:{}, _ordering:false, _currentCat:"", _bookingFlow:false };
  return sessions[from];
}

app.get("/webhook", (req, res) => {
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === CONFIG.VERIFY_TOKEN) {
    return res.status(200).send(req.query["hub.challenge"]);
  }
  res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  try {
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return res.sendStatus(200);
    const from     = message.from;
    const userText = message.type === "text" ? message.text.body.trim() : "";
    await handleMessage(from, userText);
  } catch (err) {
    console.error("Webhook Error:", err.message);
  }
  res.sendStatus(200);
});

async function handleMessage(from, text) {
  const t   = text.toLowerCase().trim();
  const ses = getSession(from);
  if (["hi","hello","namaste","hey","hii","start","0","home",""].includes(t)) {
    resetSession(from);
    return await sendWelcome(from);
  }
  if (t === "help" || t === "?") return await sendHelp(from);
  if (t === "cart" || t === "c") { ses.step = "cart"; return await showCart(from, ses); }
  switch (ses.step) {
    case "idle":
    case "main_menu":     return await handleMainMenu(from, t, ses);
    case "menu_category": return await handleMenuCategory(from, t, ses);
    case "browsing":      return await handleBrowsing(from, t, ses);
    case "cart":          return await handleCart(from, t, ses);
    case "order_type":    return await handleOrderType(from, t, ses);
    case "get_name":      return await handleGetName(from, text, ses);
    case "get_address":   return await handleGetAddress(from, text, ses);
    case "confirm_order": return await handleConfirmOrder(from, t, ses);
    case "table_date":    return await handleTableDate(from, text, ses);
    case "table_time":    return await handleTableTime(from, text, ses);
    case "table_people":  return await handleTablePeople(from, text, ses);
    case "table_name":    return await handleTableName(from, text, ses);
    case "table_confirm": return await handleTableConfirm(from, t, ses);
    default: resetSession(from); return await sendWelcome(from);
  }
}

async function sendWelcome(from) {
  await sendImage(from, CONFIG.IMAGES.welcome,
    `╔══════════════════════════╗\n🙏 *NAMASTE JI! SWAGAT HAI!*\n*${CONFIG.RESTAURANT.naam}*\n╚══════════════════════════╝\n\n_"Ghar ka swad, dil ka rishta"_ 💚\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\nAap kya karna chahenge? 👇\n\n*1* 🍽️  Menu Dekhna\n*2* 🛒  Order Karna\n*3* 📅  Table Book Karna\n*4* ⏰  Timing Jaanana\n*5* 📍  Location Dekhna\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n💬 Koi bhi number type karein\n🌐 ${CONFIG.RESTAURANT.website}`
  );
}

async function handleMainMenu(from, t, ses) {
  if (t === "1" || t.includes("menu")) {
    ses.step = "menu_category"; ses._ordering = false;
    return await sendMenuCategories(from, false);
  }
  if (t === "2" || t.includes("order")) {
    ses.step = "menu_category"; ses.cart = []; ses._ordering = true;
    return await sendImage(from, CONFIG.IMAGES.menu,
      `🛒 *ORDER KAREIN!*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nMenu se items chunein 😋\n\nKaun si category? 👇\n\n*1* ⭐  Best Sellers\n*2* 🍽️  Special Items\n*3* 📜  Poora Menu\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n*0* 🏠  Home`);
  }
  if (t === "3" || t.includes("table") || t.includes("book")) {
    ses.step = "table_date"; ses.booking = {};
    return await send(from, `📅 *TABLE BOOKING*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nAapka swagat hai! 🙏\n\n*Kaunsi tarikh ko aana chahte hain?*\n\n📝 Format: *DD/MM/YYYY*\n📝 Example: *25/06/2025*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n*0* 🏠  Home`);
  }
  if (t === "4" || t.includes("timing")) {
    return await send(from, `⏰ *KHULNE KA SAMAY*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🕙 ${CONFIG.RESTAURANT.timing}\n\n📞 ${CONFIG.RESTAURANT.phone}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n*0* 🏠  Home`);
  }
  if (t === "5" || t.includes("location") || t.includes("address")) {
    return await sendImage(from, CONFIG.IMAGES.location,
      `📍 *HAMAARA PATA*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🏠 ${CONFIG.RESTAURANT.address}\n\n📞 ${CONFIG.RESTAURANT.phone}\n🌐 ${CONFIG.RESTAURANT.website}\n\n🗺️ ${CONFIG.RESTAURANT.maps}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n*0* 🏠  Home`);
  }
  return await send(from, `⚠️ 1 se 5 ke beech number chunein.\n\n*0* 🏠  Home`);
}

async function sendMenuCategories(from) {
  await sendImage(from, CONFIG.IMAGES.menu,
    `🍽️ *HAMAARA MENU*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nKaun si category? 👇\n\n*1* ⭐  Best Sellers\n*2* 🍽️  Special Items\n*3* 📜  Poora Menu\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n*0* 🏠  Home`);
}

async function handleMenuCategory(from, t, ses) {
  const cats = Object.keys(CONFIG.MENU);
  let items = [], catName = "";
  if (t === "1") { catName = cats[0]; items = CONFIG.MENU[cats[0]]; }
  else if (t === "2") { catName = cats[1]; items = CONFIG.MENU[cats[1]]; }
  else if (t === "3") { items = [...CONFIG.MENU[cats[0]], ...CONFIG.MENU[cats[1]]]; catName = "📜 Poora Menu"; }
  else return await send(from, `⚠️ 1, 2 ya 3 chunein.\n\n*0* 🏠  Home`);
  ses._currentCat = catName; ses.step = "browsing";
  const lines = items.map(i => `*${i.id}* — ${i.naam}\n     ₹${i.price} — _${i.desc}_`).join("\n\n");
  await send(from, `${catName}\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${lines}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n${ses._ordering ? `🛒 Item ID type karein\n_Example: BS01_\n\n*cart* — Cart dekhein\n` : ``}*0* 🏠  Home`);
}

async function handleBrowsing(from, t, ses) {
  if (!ses._ordering) return await send(from, `ℹ️ Order karne ke liye *2* type karein.\n\n*0* 🏠  Home`);
  const allItems = Object.values(CONFIG.MENU).flat();
  const item = allItems.find(i => i.id === t.toUpperCase());
  if (!item) return await send(from, `⚠️ *${t.toUpperCase()}* nahi mila.\nSahi ID likhein jaise *BS01*\n\n*cart* — Cart\n*0* 🏠  Home`);
  const existing = ses.cart.find(c => c.id === item.id);
  if (existing) existing.qty += 1;
  else ses.cart.push({ ...item, qty: 1 });
  await send(from, `✅ *${item.naam}* add hua! ₹${item.price}\n\n🛒 Cart mein *${ses.cart.reduce((s,c)=>s+c.qty,0)}* items\n\n*cart* — Cart dekhein\n*0* 🏠  Home`);
}

async function showCart(from, ses) {
  if (!ses.cart.length) return await send(from, `🛒 *CART KHALI HAI*\n\n*2* type karein order ke liye\n\n*0* 🏠  Home`);
  const lines = ses.cart.map(c => `• ${c.naam} ×${c.qty} = ₹${c.price * c.qty}`).join("\n");
  const total = ses.cart.reduce((s,c) => s + c.price * c.qty, 0);
  await send(from, `🛒 *AAPKA CART*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${lines}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n💰 *TOTAL: ₹${total}*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n*checkout* — Order place karein\n*clear*    — Cart saaf karein\n*0* 🏠  Home`);
}

async function handleCart(from, t, ses) {
  if (t === "checkout") {
    if (!ses.cart.length) return await send(from, `🛒 Cart khali hai!\n\n*0* 🏠  Home`);
    ses.step = "order_type";
    return await send(from, `📦 *ORDER TYPE*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n*1* 🏠  Home Delivery\n*2* 🍽️  Dine-In\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n*0* 🏠  Home`);
  }
  if (t === "clear") { ses.cart = []; return await send(from, `🗑️ Cart saaf!\n\n*0* 🏠  Home`); }
  return await showCart(from, ses);
}

async function handleOrderType(from, t, ses) {
  if (t === "1") { ses.orderType = "Home Delivery"; ses.step = "get_name"; return await send(from, `👤 *AAPKA NAAM*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nDelivery ke liye naam chahiye 😊\n\n📝 _Example: Rahul Sharma_\n\n*0* 🏠  Home`); }
  if (t === "2") { ses.orderType = "Dine-In"; ses.step = "get_name"; return await send(from, `👤 *AAPKA NAAM*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nDine-in ke liye naam chahiye 😊\n\n📝 _Example: Rahul Sharma_\n\n*0* 🏠  Home`); }
  return await send(from, `⚠️ 1 ya 2 chunein.\n\n*0* 🏠  Home`);
}

async function handleGetName(from, text, ses) {
  if (!text || text.trim().length < 2) return await send(from, `⚠️ Sahi naam likhein.\n📝 Example: *Rahul Sharma*`);
  ses.naam = text.trim();
  if (ses.orderType === "Home Delivery") {
    ses.step = "get_address";
    return await send(from, `📍 *DELIVERY ADDRESS*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nPoora address likhein 🏠\n\n_Example: 123, Gandhi Nagar, Ujjain_\n\n*0* 🏠  Home`);
  }
  ses.address = CONFIG.RESTAURANT.address; ses.step = "confirm_order";
  return await showOrderSummary(from, ses);
}

async function handleGetAddress(from, text, ses) {
  if (!text || text.trim().length < 5) return await send(from, `⚠️ Poora address likhein.`);
  ses.address = text.trim(); ses.step = "confirm_order";
  return await showOrderSummary(from, ses);
}

async function showOrderSummary(from, ses) {
  const lines = ses.cart.map(c => `  • ${c.naam} ×${c.qty} = ₹${c.price * c.qty}`).join("\n");
  const total = ses.cart.reduce((s,c) => s + c.price * c.qty, 0);
  await send(from, `📋 *ORDER SUMMARY*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n👤 *Naam:* ${ses.naam}\n📦 *Type:* ${ses.orderType}\n${ses.orderType==="Home Delivery"?`📍 *Address:* ${ses.address}\n`:""}\n🍽️ *Items:*\n${lines}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n💰 *TOTAL: ₹${total}*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n*haan* ✅ Confirm\n*nahi* ❌ Wapas\n*0* 🏠  Home`);
}

async function handleConfirmOrder(from, t, ses) {
  if (["haan","yes","confirm","ok","ha","han"].includes(t)) {
    const orderId = "VR" + Date.now().toString().slice(-5);
    const total = ses.cart.reduce((s,c) => s + c.price * c.qty, 0);
    const naam = ses.naam, address = ses.orderType === "Home Delivery" ? ses.address : "", type = ses.orderType;
    const items = ses.cart.map(c => `  • ${c.naam} ×${c.qty}`).join("\n");
    resetSession(from);
    return await sendImage(from, CONFIG.IMAGES.order,
      `🎉 *ORDER CONFIRMED!*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🆔 *Order ID:* #${orderId}\n👤 *Naam:* ${naam}\n📦 *Type:* ${type}\n${address?`📍 *Address:* ${address}\n`:""}\n🍽️ *Items:*\n${items}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n💰 *TOTAL: ₹${total}*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏱️ *30–45 minutes*\n📞 ${CONFIG.RESTAURANT.phone}\n\n🙏 *Shukriya ${naam} ji!* 💚\n\n*0* 🏠  Home`);
  }
  if (["nahi","no","na","cancel"].includes(t)) { ses.step = "cart"; return await showCart(from, ses); }
  return await send(from, `⚠️ *haan* ya *nahi* type karein.\n\n*0* 🏠  Home`);
}

async function handleTableDate(from, text, ses) {
  if (!/\d{1,2}\/\d{1,2}\/\d{4}/.test(text)) return await send(from, `⚠️ Format: *DD/MM/YYYY*\nExample: *25/06/2025*\n\n*0* 🏠  Home`);
  ses.booking.date = text.trim(); ses.step = "table_time";
  return await send(from, `⏰ *SAMAY BATAYEIN*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nKitne baje aana chahte hain?\n\n📝 Format: *HH:MM AM/PM*\n📝 Example: *07:30 PM*\n\n*0* 🏠  Home`);
}

async function handleTableTime(from, text, ses) {
  ses.booking.time = text.trim(); ses.step = "table_people";
  return await send(from, `👥 *KITNE LOG?*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nKitne logon ke liye table chahiye?\n\n📝 Sirf number: *4*\n\n*0* 🏠  Home`);
}

async function handleTablePeople(from, text, ses) {
  const num = parseInt(text);
  if (isNaN(num) || num < 1 || num > 50) return await send(from, `⚠️ 1–50 ke beech number likhein.\n\n*0* 🏠  Home`);
  ses.booking.people = num; ses.step = "table_name";
  return await send(from, `👤 *AAPKA NAAM*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nBooking ke liye naam chahiye 😊\n\n📝 _Example: Rahul Sharma_\n\n*0* 🏠  Home`);
}

async function handleTableName(from, text, ses) {
  if (!text || text.trim().length < 2) return await send(from, `⚠️ Sahi naam likhein.`);
  ses.naam = text.trim(); ses.step = "table_confirm";
  const b = ses.booking;
  await send(from, `📋 *BOOKING SUMMARY*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n👤 *Naam:*    ${ses.naam}\n📅 *Tarikh:*  ${b.date}\n⏰ *Samay:*   ${b.time}\n👥 *Log:*     ${b.people} person(s)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n*haan* ✅ Confirm\n*nahi* ❌ Wapas\n*0* 🏠  Home`);
}

async function handleTableConfirm(from, t, ses) {
  if (["haan","yes","confirm","ok","ha","han"].includes(t)) {
    const b = ses.booking, naam = ses.naam, bookId = "BK" + Date.now().toString().slice(-5);
    resetSession(from);
    return await send(from, `🎉 *TABLE BOOKING CONFIRMED!*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🆔 *Booking ID:* #${bookId}\n👤 *Naam:*       ${naam}\n📅 *Tarikh:*     ${b.date}\n⏰ *Samay:*      ${b.time}\n👥 *Log:*        ${b.people} person(s)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n📞 ${CONFIG.RESTAURANT.phone}\n\n🙏 *Shukriya ${naam} ji!* 💚\n\n*0* 🏠  Home`);
  }
  if (["nahi","no","na","cancel"].includes(t)) { ses.step = "table_date"; ses.booking = {}; return await send(from, `🔄 Dobara tarikh chunein:\n\n📝 Format: *DD/MM/YYYY*\n\n*0* 🏠  Home`); }
  return await send(from, `⚠️ *haan* ya *nahi* type karein.\n\n*0* 🏠  Home`);
}

async function sendHelp(from) {
  await send(from, `ℹ️ *HELP*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n*hi* — Main menu\n*1* — Menu\n*2* — Order\n*3* — Table booking\n*4* — Timing\n*5* — Location\n*cart* — Cart\n*0* — Home\n*?* — Help\n\n📞 ${CONFIG.RESTAURANT.phone}\n🌐 ${CONFIG.RESTAURANT.website}`);
}

async function send(to, body) {
  await callWhatsApp(to, { type:"text", text:{ body, preview_url:false } });
}

async function sendImage(to, imageUrl, caption) {
  try {
    await callWhatsApp(to, { type:"image", image:{ link:imageUrl, caption } });
  } catch {
    await send(to, caption);
  }
}

async function callWhatsApp(to, msgObj) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${CONFIG.PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${CONFIG.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product:"whatsapp", recipient_type:"individual", to, ...msgObj }),
    }
  );
  const data = await res.json();
  if (!res.ok) console.error("WhatsApp API Error:", JSON.stringify(data));
}

app.get("/", (req, res) => res.json({ status:"🟢 Online", restaurant:CONFIG.RESTAURANT.naam, message:"WhatsApp Bot chal raha hai!" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`\n🍽️  ${CONFIG.RESTAURANT.naam} — WhatsApp Bot\n✅ Port ${PORT} — Ready!\n`));

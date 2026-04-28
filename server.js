const express = require("express");
const app = express();
app.use(express.json());

// ════════════════════════════════════════
//  CONFIG
// ════════════════════════════════════════
const CONFIG = {
  VERIFY_TOKEN:    "myrestaurant2024",
  WHATSAPP_TOKEN:  "EAAjnwOs4RTkBRRZAVRIu7RZAgPFW1t8ig1IMR4OC386lQC5PKM8DMItybzU4dU5ZAyRNR5KTjip5yxROcmptQ0Pz5IdGZCxZAUgvCOOSE0kSZAFBzxZAw5OkgUcm1ZCLC7Bau4JAaX1NZB8I34ksLa2DejMq4MpMhib8un3IegEZCCCN7TayTr5g7x7dFz1UJtMdCuZABLE3pUiPGwA2J7W5nadZBiX0SUkLg8SxS3ZA4XiMPaKdE7pQ2kAZDZD",
  PHONE_NUMBER_ID: "1093322707193885",

  RESTAURANT: {
    naam:    "Vrindavan Restaurant",
    address: "Runija-Khachrod Road, Bhatpachlana, Maloda, Ujjain, MP - 456313",
    phone:   "+91-9303984127",
    website: "vrindavanrestro.in",
    maps:    "https://maps.google.com/?q=Vrindavan+Restaurant+Maloda+Ujjain",
    timing:  "Roz Subah 11:00 baje se Raat 11:30 baje tak",
  },

  // Public image URLs — aap inhe apni images se badal sakte hain
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

// ════════════════════════════════════════
//  SESSION STORE
// ════════════════════════════════════════
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

// ════════════════════════════════════════
//  WEBHOOK SETUP
// ════════════════════════════════════════
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

// ════════════════════════════════════════
//  MAIN MESSAGE HANDLER
// ════════════════════════════════════════
async function handleMessage(from, text) {
  const t   = text.toLowerCase().trim();
  const ses = getSession(from);

  // Global reset triggers
  if (["hi","hello","namaste","hey","hii","start","0","home",""].includes(t)) {
    resetSession(from);
    return await sendWelcome(from);
  }
  if (t === "help" || t === "?") return await sendHelp(from);
  if (t === "cart" || t === "c") {
    ses.step = "cart";
    return await showCart(from, ses);
  }

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
    default:
      resetSession(from);
      return await sendWelcome(from);
  }
}

// ════════════════════════════════════════
//  WELCOME MESSAGE
// ════════════════════════════════════════
async function sendWelcome(from) {
  await sendImage(from, CONFIG.IMAGES.welcome,
    `╔══════════════════════════╗\n` +
    `  🙏 *NAMASTE JI! SWAGAT HAI!*\n` +
    `  *${CONFIG.RESTAURANT.naam}*\n` +
    `╚══════════════════════════╝\n\n` +
    `_"Ghar ka swad, dil ka rishta"_ 💚\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Aap kya karna chahenge? 👇\n\n` +
    `*1* 🍽️  Menu Dekhna\n` +
    `*2* 🛒  Order Karna\n` +
    `*3* 📅  Table Book Karna\n` +
    `*4* ⏰  Timing Jaanana\n` +
    `*5* 📍  Location Dekhna\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💬 Koi bhi number type karein\n` +
    `🌐 ${CONFIG.RESTAURANT.website}`
  );
}

// ════════════════════════════════════════
//  MAIN MENU ROUTER
// ════════════════════════════════════════
async function handleMainMenu(from, t, ses) {
  if (t === "1" || t.includes("menu")) {
    ses.step = "menu_category";
    ses._ordering = false;
    return await sendMenuCategories(from, false);
  }
  if (t === "2" || t.includes("order")) {
    ses.step = "menu_category";
    ses.cart = [];
    ses._ordering = true;
    return await sendImage(from, CONFIG.IMAGES.menu,
      `🛒 *ORDER KAREIN!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Menu se items chunein aur cart mein add karein 😋\n\n` +
      `Kaun si category? 👇\n\n` +
      `*1* ⭐  Best Sellers\n` +
      `*2* 🍽️  Special Items\n` +
      `*3* 📜  Poora Menu\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*0* 🏠  Home`
    );
  }
  if (t === "3" || t.includes("table") || t.includes("book")) {
    ses.step = "table_date";
    ses.booking = {};
    return await send(from,
      `📅 *TABLE BOOKING*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Aapka swagat hai! 🙏\n\n` +
      `*Kaunsi tarikh ko aana chahte hain?*\n\n` +
      `📝 Format: *DD/MM/YYYY*\n` +
      `📝 Example: *25/06/2025*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*0* 🏠  Home`
    );
  }
  if (t === "4" || t.includes("timing") || t.includes("time")) {
    return await send(from,
      `⏰ *KHULNE KA SAMAY*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🕙 ${CONFIG.RESTAURANT.timing}\n\n` +
      `📞 Reservation: ${CONFIG.RESTAURANT.phone}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*0* 🏠  Home`
    );
  }
  if (t === "5" || t.includes("location") || t.includes("address") || t.includes("kahan")) {
    return await sendImage(from, CONFIG.IMAGES.location,
      `📍 *HAMAARA PATA*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🏠 ${CONFIG.RESTAURANT.address}\n\n` +
      `📞 ${CONFIG.RESTAURANT.phone}\n` +
      `🌐 ${CONFIG.RESTAURANT.website}\n\n` +
      `🗺️ *Google Maps:*\n${CONFIG.RESTAURANT.maps}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*0* 🏠  Home`
    );
  }
  return await sendWelcome(from);
}

// ════════════════════════════════════════
//  MENU CATEGORIES
// ════════════════════════════════════════
async function sendMenuCategories(from, ordering) {
  await send(from,
    `📋 *MENU CATEGORIES*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `*1* ⭐  Best Sellers — Top dishes\n` +
    `*2* 🍽️  Special Items — Unique flavors\n` +
    `*3* 📜  Poora Menu — Sab kuch\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    (ordering ? `🛒 *cart* — Cart dekhein\n` : `🛒 *order* — Order karein\n`) +
    `*0* 🏠  Home`
  );
}

async function handleMenuCategory(from, t, ses) {
  let category = null;
  if (t === "1" || t.includes("best")) category = "⭐ Best Sellers";
  if (t === "2" || t.includes("special")) category = "🍽️ Special Items";

  if (t === "3" || t.includes("poora") || t.includes("full") || t.includes("sab")) {
    ses.step = "browsing";
    ses._currentCat = "ALL";
    return await sendFullMenu(from, ses._ordering);
  }
  if (!category) {
    return await send(from, `⚠️ Kripya *1*, *2* ya *3* type karein.\n\n*0* 🏠  Home`);
  }

  ses.step = "browsing";
  ses._currentCat = category;
  return await sendCategoryMenu(from, category, ses._ordering);
}

// ════════════════════════════════════════
//  CATEGORY MENU DISPLAY
// ════════════════════════════════════════
async function sendCategoryMenu(from, category, ordering) {
  const items = CONFIG.MENU[category];
  let text = `📋 *${category}*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  items.forEach((item, idx) => {
    text += `*${idx + 1}.* ${item.naam} — *₹${item.price}*\n`;
    text += `    _${item.desc}_\n\n`;
  });
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  if (ordering) {
    text += `🛒 Number type karein — cart mein add hoga\n`;
    text += `   _Example: *3* (Dal Tadka add hoga)_\n\n`;
    text += `*cart* — Cart dekhein ✅\n`;
  } else {
    text += `🛒 *order* — Is menu se order karein\n`;
  }
  text += `*back* — Dusri category\n`;
  text += `*0* 🏠  Home`;
  await sendImage(from, CONFIG.IMAGES.menu, text);
}

async function sendFullMenu(from, ordering) {
  let text = `📋 *${CONFIG.RESTAURANT.naam}*\n*— POORA MENU —*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  for (const [cat, items] of Object.entries(CONFIG.MENU)) {
    text += `*${cat}*\n`;
    items.forEach(i => { text += `  • ${i.naam} — ₹${i.price}\n`; });
    text += "\n";
  }
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  if (ordering) {
    text += `🛒 Category chunein items add karne ke liye:\n*1* Best Sellers | *2* Special Items\n\n`;
  } else {
    text += `🛒 *order* — Order karein\n`;
  }
  text += `*0* 🏠  Home`;
  await send(from, text);
}

// ════════════════════════════════════════
//  BROWSING — Add to Cart
// ════════════════════════════════════════
async function handleBrowsing(from, t, ses) {
  if (t === "back" || t === "b") {
    ses.step = "menu_category";
    return await sendMenuCategories(from, ses._ordering);
  }
  if (t === "order") {
    ses._ordering = true;
    ses.cart = [];
    ses.step = "menu_category";
    return await sendMenuCategories(from, true);
  }

  // Add item to cart (only in ordering mode)
  if (ses._ordering && ses._currentCat && ses._currentCat !== "ALL") {
    const items = CONFIG.MENU[ses._currentCat];
    const idx   = parseInt(t) - 1;
    if (!isNaN(idx) && idx >= 0 && idx < items.length) {
      const item     = items[idx];
      const existing = ses.cart.find(c => c.id === item.id);
      if (existing) {
        existing.qty += 1;
      } else {
        ses.cart.push({ ...item, qty: 1 });
      }
      const total     = ses.cart.reduce((s, c) => s + c.price * c.qty, 0);
      const cartCount = ses.cart.reduce((s, c) => s + c.qty, 0);
      return await send(from,
        `✅ *CART MEIN ADD!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🍽️ *${item.naam}*\n` +
        `💰 ₹${item.price} per plate\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🛒 Cart: *${cartCount} item(s)* — Total: *₹${total}*\n\n` +
        `Aur kuch add karna hai? 😋\n` +
        `Number type karein\n\n` +
        `*cart* — Cart dekhein & order karein ✅\n` +
        `*back* — Dusri category\n` +
        `*0* 🏠  Home`
      );
    }
  }

  return await send(from,
    `⚠️ Samajh nahi aaya.\n\n` +
    `🔢 Item ka number type karein\n` +
    `*cart* — Cart dekhein\n` +
    `*back* — Wapas jaein\n` +
    `*0* 🏠  Home`
  );
}

// ════════════════════════════════════════
//  CART
// ════════════════════════════════════════
async function showCart(from, ses) {
  if (!ses.cart || ses.cart.length === 0) {
    return await send(from,
      `🛒 *CART KHAALI HAI!*\n\n` +
      `Menu se kuch items chunein 😊\n\n` +
      `*1* — Menu dekhein\n` +
      `*2* — Order start karein\n` +
      `*0* 🏠  Home`
    );
  }
  const total = ses.cart.reduce((s, c) => s + c.price * c.qty, 0);
  let text = `🛒 *AAPKA CART*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  ses.cart.forEach((item, i) => {
    text += `*${i + 1}.* ${item.naam}\n`;
    text += `    ${item.qty} × ₹${item.price} = *₹${item.price * item.qty}*\n\n`;
  });
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💰 *KULL TOTAL: ₹${total}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `*confirm* ✅ — Order place karein\n`;
  text += `*add* ➕ — Aur items add karein\n`;
  text += `*clear* 🗑️ — Cart khaali karein\n`;
  text += `*0* 🏠  Home`;
  await send(from, text);
}

async function handleCart(from, t, ses) {
  if (["confirm","yes","ok","haan","ha","han"].includes(t)) {
    ses.step = "order_type";
    return await send(from,
      `📦 *ORDER TYPE CHUNEIN*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Aap kaise order chahte hain?\n\n` +
      `*1* 🏠  *Home Delivery*\n` +
      `*2* 🍽️  *Dine In* (Restaurant mein khana)\n` +
      `*3* 📦  *Takeaway* (Parcel le jaana)\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*0* 🏠  Home`
    );
  }
  if (t === "add" || t === "a") {
    ses.step = "menu_category";
    ses._ordering = true;
    return await sendMenuCategories(from, true);
  }
  if (t === "clear") {
    ses.cart = [];
    resetSession(from);
    return await send(from,
      `🗑️ *Cart khaali kar di!*\n\n` +
      `Naya order karne ke liye:\n` +
      `*2* — Order karein\n` +
      `*0* 🏠  Home`
    );
  }
  return await showCart(from, ses);
}

// ════════════════════════════════════════
//  ORDER TYPE
// ════════════════════════════════════════
async function handleOrderType(from, t, ses) {
  const types = {
    "1": "🏠 Home Delivery",
    "2": "🍽️ Dine In",
    "3": "📦 Takeaway/Parcel",
  };
  if (t.includes("home") || t.includes("delivery")) ses.orderType = types["1"];
  else if (t.includes("dine") || t.includes("restaurant")) ses.orderType = types["2"];
  else if (t.includes("takeaway") || t.includes("parcel")) ses.orderType = types["3"];
  else if (types[t]) ses.orderType = types[t];
  else return await send(from, `⚠️ Kripya *1*, *2* ya *3* chunein.\n\n*0* 🏠  Home`);

  ses.step = "get_name";
  return await send(from,
    `👤 *AAPKA NAAM*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Order ke liye aapka naam chahiye 😊\n\n` +
    `📝 Apna *poora naam* type karein:\n` +
    `_Example: Rahul Sharma_\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*0* 🏠  Home`
  );
}

// ════════════════════════════════════════
//  GET NAME
// ════════════════════════════════════════
async function handleGetName(from, text, ses) {
  if (!text || text.trim().length < 2) {
    return await send(from, `⚠️ Kripya sahi naam likhein.\n📝 Example: *Rahul Sharma*`);
  }
  ses.naam = text.trim();

  if (ses.orderType === "🏠 Home Delivery") {
    ses.step = "get_address";
    return await send(from,
      `📍 *DELIVERY ADDRESS*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Aapka delivery address kya hai? 🏠\n\n` +
      `📝 Poora address likhein:\n` +
      `_Example: Gali no 3, Near School, Maloda, Ujjain_\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*0* 🏠  Home`
    );
  }
  ses.step = "confirm_order";
  return await showOrderSummary(from, ses);
}

// ════════════════════════════════════════
//  GET ADDRESS
// ════════════════════════════════════════
async function handleGetAddress(from, text, ses) {
  if (!text || text.trim().length < 5) {
    return await send(from, `⚠️ Kripya sahi address likhein.\n📝 Example: *Gali no 3, Maloda, Ujjain*`);
  }
  ses.address = text.trim();
  ses.step    = "confirm_order";
  return await showOrderSummary(from, ses);
}

// ════════════════════════════════════════
//  ORDER SUMMARY
// ════════════════════════════════════════
async function showOrderSummary(from, ses) {
  const total = ses.cart.reduce((s, c) => s + c.price * c.qty, 0);
  let text = `📋 *ORDER SUMMARY*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `👤 *Naam:*       ${ses.naam}\n`;
  text += `📦 *Order Type:* ${ses.orderType}\n`;
  if (ses.address) text += `📍 *Address:*    ${ses.address}\n`;
  text += `\n🍽️ *Aapke Items:*\n`;
  ses.cart.forEach(item => {
    text += `  • ${item.naam} × ${item.qty} = ₹${item.price * item.qty}\n`;
  });
  text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💰 *TOTAL: ₹${total}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `*haan* ✅ — Confirm karein\n`;
  text += `*nahi* ❌ — Wapas cart mein jaein\n`;
  text += `*0* 🏠  Home`;
  await send(from, text);
}

async function handleConfirmOrder(from, t, ses) {
  if (["haan","yes","confirm","ok","ha","han"].includes(t)) {
    const total   = ses.cart.reduce((s, c) => s + c.price * c.qty, 0);
    const orderId = "VR" + Date.now().toString().slice(-5);
    const naam    = ses.naam;
    const type    = ses.orderType;
    const address = ses.address;
    const items   = ses.cart.map(c => `${c.naam} ×${c.qty}`).join(", ");

    resetSession(from);

    return await sendImage(from, CONFIG.IMAGES.order,
      `🎉 *ORDER CONFIRM HO GAYA!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🆔 *Order ID:* #${orderId}\n` +
      `👤 *Naam:* ${naam}\n` +
      `📦 *Type:* ${type}\n` +
      (address ? `📍 *Address:* ${address}\n` : "") +
      `\n🍽️ *Items:*\n${items.split(", ").map(i => `  • ${i}`).join("\n")}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 *TOTAL: ₹${total}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `⏱️ *Taiyari samay: 30–45 minutes*\n\n` +
      `📞 Kisi bhi sawaal ke liye:\n` +
      `${CONFIG.RESTAURANT.phone}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🙏 *Shukriya ${naam} ji!*\n` +
      `Aapka intezaar rahega! 💚\n\n` +
      `*0* 🏠  Home`
    );
  }
  if (["nahi","no","na","cancel"].includes(t)) {
    ses.step = "cart";
    return await showCart(from, ses);
  }
  return await send(from, `⚠️ *haan* ya *nahi* type karein.\n\n*0* 🏠  Home`);
}

// ════════════════════════════════════════
//  TABLE BOOKING FLOW
// ════════════════════════════════════════
async function handleTableDate(from, text, ses) {
  if (!/\d{1,2}\/\d{1,2}\/\d{4}/.test(text)) {
    return await send(from,
      `⚠️ Galat format!\n\n📝 Sahi format: *DD/MM/YYYY*\n📝 Example: *25/06/2025*\n\n*0* 🏠  Home`
    );
  }
  ses.booking.date = text.trim();
  ses.step = "table_time";
  return await send(from,
    `⏰ *SAMAY BATAYEIN*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Kitne baje aana chahte hain? 🕙\n\n` +
    `📝 Format: *HH:MM AM/PM*\n` +
    `📝 Example: *07:30 PM*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*0* 🏠  Home`
  );
}

async function handleTableTime(from, text, ses) {
  ses.booking.time = text.trim();
  ses.step = "table_people";
  return await send(from,
    `👥 *KITNE LOG AAYENGE?*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Kitne logon ke liye table chahiye? 🙂\n\n` +
    `📝 Sirf number likhein: *4*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*0* 🏠  Home`
  );
}

async function handleTablePeople(from, text, ses) {
  const num = parseInt(text);
  if (isNaN(num) || num < 1 || num > 50) {
    return await send(from, `⚠️ Sahi number likhein (1–50).\n📝 Example: *4*\n\n*0* 🏠  Home`);
  }
  ses.booking.people = num;
  ses.step = "table_name";
  return await send(from,
    `👤 *AAPKA NAAM*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Booking ke liye naam chahiye 😊\n\n` +
    `📝 Apna *poora naam* likhein:\n` +
    `_Example: Rahul Sharma_\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*0* 🏠  Home`
  );
}

async function handleTableName(from, text, ses) {
  if (!text || text.trim().length < 2) {
    return await send(from, `⚠️ Kripya sahi naam likhein.\n📝 Example: *Rahul Sharma*`);
  }
  ses.naam = text.trim();
  ses.step = "table_confirm";

  const b = ses.booking;
  await send(from,
    `📋 *BOOKING SUMMARY*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `👤 *Naam:*    ${ses.naam}\n` +
    `📅 *Tarikh:*  ${b.date}\n` +
    `⏰ *Samay:*   ${b.time}\n` +
    `👥 *Log:*     ${b.people} person(s)\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*haan* ✅ — Confirm karein\n` +
    `*nahi* ❌ — Wapas jaein\n` +
    `*0* 🏠  Home`
  );
}

async function handleTableConfirm(from, t, ses) {
  if (["haan","yes","confirm","ok","ha","han"].includes(t)) {
    const b      = ses.booking;
    const naam   = ses.naam;
    const bookId = "BK" + Date.now().toString().slice(-5);

    resetSession(from);

    return await send(from,
      `🎉 *TABLE BOOKING CONFIRMED!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🆔 *Booking ID:* #${bookId}\n` +
      `👤 *Naam:*       ${naam}\n` +
      `📅 *Tarikh:*     ${b.date}\n` +
      `⏰ *Samay:*      ${b.time}\n` +
      `👥 *Log:*        ${b.people} person(s)\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📞 Confirmation call:\n${CONFIG.RESTAURANT.phone}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🙏 *Shukriya ${naam} ji!*\n` +
      `Aapka dil se swagat hoga! 💚\n\n` +
      `*0* 🏠  Home`
    );
  }
  if (["nahi","no","na","cancel"].includes(t)) {
    ses.step = "table_date";
    ses.booking = {};
    return await send(from,
      `🔄 Dobara tarikh chunein:\n\n📝 Format: *DD/MM/YYYY*\n\n*0* 🏠  Home`
    );
  }
  return await send(from, `⚠️ *haan* ya *nahi* type karein.\n\n*0* 🏠  Home`);
}

// ════════════════════════════════════════
//  HELP
// ════════════════════════════════════════
async function sendHelp(from) {
  await send(from,
    `ℹ️ *HELP — COMMANDS*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `*hi / hello* — Main menu\n` +
    `*1 / menu*   — Menu dekhein\n` +
    `*2 / order*  — Order karein\n` +
    `*3 / table*  — Table book karein\n` +
    `*4 / timing* — Khulne ka samay\n` +
    `*5 / location* — Hamara pata\n` +
    `*cart*       — Cart dekhein\n` +
    `*0*          — Home par jaein\n` +
    `*?*          — Ye help menu\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📞 ${CONFIG.RESTAURANT.phone}\n` +
    `🌐 ${CONFIG.RESTAURANT.website}`
  );
}

// ════════════════════════════════════════
//  SEND HELPERS
// ════════════════════════════════════════
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
      headers: {
        Authorization:  `Bearer ${CONFIG.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type:    "individual",
        to,
        ...msgObj,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) console.error("WhatsApp API Error:", JSON.stringify(data));
}

// ════════════════════════════════════════
//  SERVER
// ════════════════════════════════════════
app.get("/", (req, res) =>
  res.json({
    status:     "🟢 Online",
    restaurant: CONFIG.RESTAURANT.naam,
    message:    "WhatsApp Bot chal raha hai!",
  })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`\n🍽️  ${CONFIG.RESTAURANT.naam} — WhatsApp Bot\n✅ Port ${PORT} — Ready!\n`)
);

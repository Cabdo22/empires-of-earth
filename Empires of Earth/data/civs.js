// ============================================================
// CIVILIZATION DEFINITIONS
// ============================================================

export const CIV_DEFS = {
  Rome: {
    name: "Roman Empire", color: "#e74c3c", colorBg: "#8b1a1a", colorLight: "#e07070",
    bonus: "+1 production per city",
    desc: "Master builders who forge empires through industry.",
    capital: "Rome",
    cityNames: ["Roma", "Antium", "Capua", "Neapolis", "Pompeii"],
  },
  China: {
    name: "Chinese Dynasty", color: "#3498db", colorBg: "#1a4a8b", colorLight: "#60b0d8",
    bonus: "+1 science per city",
    desc: "Ancient scholars who unlock the secrets of the world.",
    capital: "Beijing",
    cityNames: ["Chang'an", "Luoyang", "Nanjing", "Suzhou", "Hangzhou"],
  },
  Egypt: {
    name: "Egyptian Kingdom", color: "#f1c40f", colorBg: "#8b7a0a", colorLight: "#f0e060",
    bonus: "+1 food on grassland cities",
    desc: "River-fed civilization of pharaohs and pyramids.",
    capital: "Thebes",
    cityNames: ["Memphis", "Alexandria", "Luxor", "Giza", "Aswan"],
  },
  Aztec: {
    name: "Aztec Empire", color: "#27ae60", colorBg: "#1a6b3a", colorLight: "#60d890",
    bonus: "+1 strength for melee units",
    desc: "Fierce warriors who conquer through blood and sacrifice.",
    capital: "Tenochtitlan",
    cityNames: ["Texcoco", "Tlacopan", "Cholula", "Tlaxcala", "Xochimilco"],
  },
  America: {
    name: "United States", color: "#2c3e80", colorBg: "#1a2550", colorLight: "#6080c0",
    bonus: "+1 gold per city",
    desc: "A nation built on liberty, expansion, and economic power.",
    capital: "Washington",
    cityNames: ["New York", "Boston", "Philadelphia", "Chicago", "Los Angeles"],
  },
  England: {
    name: "English Empire", color: "#c0392b", colorBg: "#6b1a15", colorLight: "#e08080",
    bonus: "+1 naval movement, +1 gold from water",
    desc: "Rulers of the seas with an empire spanning the globe.",
    capital: "London",
    cityNames: ["Liverpool", "Manchester", "Bristol", "York", "Canterbury"],
  },
  France: {
    name: "French Republic", color: "#8e44ad", colorBg: "#4a1a6b", colorLight: "#c080e0",
    bonus: "+1 sci & gold with Library/Market",
    desc: "A beacon of enlightenment, culture, and military élan.",
    capital: "Paris",
    cityNames: ["Lyon", "Marseille", "Bordeaux", "Orléans", "Toulouse"],
  },
  Germany: {
    name: "German Empire", color: "#7f8c8d", colorBg: "#3a4040", colorLight: "#b0c0c0",
    bonus: "-1 unit cost, +1 prod with Workshop",
    desc: "Industrial powerhouse with unmatched engineering.",
    capital: "Berlin",
    cityNames: ["Hamburg", "Munich", "Cologne", "Frankfurt", "Dresden"],
  },
  Ottoman: {
    name: "Ottoman Empire", color: "#d35400", colorBg: "#6b2a00", colorLight: "#e0a060",
    bonus: "+1 siege str, +1 gold captured cities",
    desc: "Siege masters who forge empires through conquest.",
    capital: "Constantinople",
    cityNames: ["Ankara", "Izmir", "Bursa", "Edirne", "Konya"],
  },
};

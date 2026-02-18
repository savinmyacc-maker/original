const fs = require('fs');
const path = require('path');

const settings = {
  prefixes: ['.', '!', '/', '#'], // Multiple prefix support you can add one or more
  packname: 'Infinity MD',
  author: '‎GlobalTechInfo',
  timeZone: 'Asia/Karachi',
  // Easy customization - edit these values to configure your bot
  botName: "Infinity MD", // your bot name
  botOwner: '@jid user name', // set your display owner name
  ownerNumber: '923051391007', // Set your number here without + symbol, just add country code & number without any space
  // Add image URLs (http/https) to prefer for menu and ping. Local `/assets` images are used as fallback.
  menuImageUrls: [], // e.g. ['https://example.com/menu1.jpg']
  pingImageUrls: [], // e.g. ['https://example.com/ping1.jpg']
  // Small note appended to the connected notification
  connectNote: '',
  giphyApiKey: 'qnl7ssQChTdPjsKta2Ax2LMaGXz303tq',
  commandMode: "public",
  maxStoreMessages: 20,
  tempCleanupInterval: 1 * 60 * 60 * 1000, // 1 hours
  storeWriteInterval: 10000,
  description: "This is a bot for managing group commands and automating tasks.",
  version: "5.1.0",
  updateZipUrl: "https://github.com/GlobalTechInfo/MEGA-MD/archive/refs/heads/main.zip",
  channelLink: "",
  ytch: "GlobalTechInfo"
};

// merge overrides from data/manage.json (simple editable file used by dashboard)
const overridePath = path.join(__dirname, 'data', 'manage.json');

function loadOverrides() {
  try {
    if (!fs.existsSync(overridePath)) return;
    const raw = fs.readFileSync(overridePath, 'utf8');
    const overrides = JSON.parse(raw || '{}');
    Object.assign(settings, overrides);
    console.log('Settings overrides loaded from data/manage.json');
  } catch (e) {
    console.log('Failed to load manage.json overrides:', e.message);
  }
}

loadOverrides();

// Watch file for changes and hot-reload overrides (debounced)
let reloadTimer = null;
try {
  fs.watch(overridePath, (eventType) => {
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      console.log('Detected change in data/manage.json — reloading settings');
      loadOverrides();
    }, 250);
  });
} catch (e) {
  // fs.watch may throw if file doesn't exist yet; fallback to watchFile
  try {
    fs.watchFile(overridePath, { interval: 1000 }, (curr, prev) => {
      if (curr.mtimeMs !== prev.mtimeMs) {
        console.log('Detected change in data/manage.json (watchFile) — reloading settings');
        loadOverrides();
      }
    });
  } catch (err) {
    // noop
  }
}

module.exports = settings;


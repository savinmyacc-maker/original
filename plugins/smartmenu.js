const CommandHandler = require('../lib/commandHandler');
const settings = require("../settings");
const fs = require('fs');
const path = require('path');
const os = require('os');

function pickRandomAsset() {
  const assetsDir = path.join(__dirname, '../assets');
  try {
    if (!fs.existsSync(assetsDir)) {
      console.log('Assets dir does not exist:', assetsDir);
      return null;
    }
    const files = fs.readdirSync(assetsDir).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
    if (!files || files.length === 0) {
      console.log('No image files found in:', assetsDir);
      return null;
    }
    const choice = files[Math.floor(Math.random() * files.length)];
    return path.join(assetsDir, choice);
  } catch (e) {
    console.log('Error in pickRandomAsset:', e.message);
    return null;
  }
}

function formatUptime() {
    let uptime = Math.floor(process.uptime());
    const days = Math.floor(uptime / 86400);
    uptime %= 86400;
    const hours = Math.floor(uptime / 3600);
    uptime %= 3600;
    const minutes = Math.floor(uptime / 60);
    const seconds = uptime % 60;

    const parts = [];
    if (days) parts.push(`${days} days`);
    if (hours) parts.push(`${hours} hours`);
    if (minutes) parts.push(`${minutes} minutes`);
    if (seconds || parts.length === 0) parts.push(`${seconds} seconds`);
    return parts.join(' ');
}

function getRAMUsage() {
  const totalMB = os.totalmem() / 1024 / 1024;
  const freeMB = os.freemem() / 1024 / 1024;
  const usedMB = totalMB - freeMB;
  const percent = ((usedMB / totalMB) * 100).toFixed(1);
  const procMem = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
  return `${(usedMB/1024).toFixed(2)} GB / ${(totalMB/1024).toFixed(2)} GB (${percent}%) · Proc ${procMem} MB`;
}

module.exports = {
  command: 'smenu',
  aliases: ['shelp', 'smart', 'menu', 'help'],
  category: 'general',
  description: 'Interactive smart menu with live status',
  usage: '.menu [forward]',
  isPrefixless: true,

  async handler(sock, message, args, context = {}) {
    const chatId = context.chatId || message.key.remoteJid;
    const isForwarded = args && args.length > 0 && (args[0].toLowerCase() === 'forward' || args[0].toLowerCase() === 'fwd');
    const forwardCount = parseInt(args?.[1]) || 5; // Default to 5 forwards if not specified

    try {
      const imagePath = pickRandomAsset();
      const thumbnail = imagePath && fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : null;
      console.log('Menu Debug - imagePath:', imagePath);
      console.log('Menu Debug - thumbnail exists:', !!thumbnail);
      console.log('Menu Debug - thumbnail size:', thumbnail ? thumbnail.length : 0);
      console.log('Menu Debug - isForwarded:', isForwarded, 'forwardCount:', forwardCount);

      const commandCount = CommandHandler.commands.size;
      const prefix = settings.prefixes ? settings.prefixes[0] : '.';

      const load = os.loadavg()[0] ? os.loadavg()[0].toFixed(2) : '0.00';
      let menuText = `╭─〔 🤖 INFINITY MD 〕─╮\n` +
        `│ 👤 Owner : ${settings.botOwner || 'Default Publisher'}\n` +
        `│ 📊 Commands : ${commandCount}+    │ ⌨️ Prefix : ${prefix}\n` +
        `│ ⏱ Uptime  : ${formatUptime()}\n` +
        `│ 💾 RAM     : ${getRAMUsage()}\n` +
        `│ 🧮 Load(1m): ${load}    │ CPU Cores: ${os.cpus().length}\n` +
        `╰──────────────────────╯\n\n` +
        `╭─〔 📂 MAIN MENUS 〕─╮\n` +
        `│ 👑 ${prefix}ownermenu   │ 🧩 ${prefix}groupmenu\n` +
        `│ 📥 ${prefix}dlmenu     │ 🎮 ${prefix}funmenu\n` +
        `│ 🤖 ${prefix}aimenu     │ 🖼 ${prefix}stickermenu\n` +
        `│ 🎵 ${prefix}audiomenu  │ 🎥 ${prefix}videomenu\n` +
        `│ 🔍 ${prefix}searchmenu │ 🛠 ${prefix}toolsmenu\n` +
        `│ 🧠 ${prefix}convertmenu │ ⚙️ ${prefix}settingsmenu\n` +
        `│ 🗄 ${prefix}dbmenu      │ 🧪 ${prefix}othermenu\n` +
        `╰──────────────────────╯\n\n` +
        `💫 INFINITY MD - Powered by AI`;

      const messageOptions = { quoted: message };
      
      // Add forward metadata if requested
      if (isForwarded) {
        messageOptions.forward = forwardCount;
      }

      if (thumbnail) {
        console.log('Sending menu with image, size:', thumbnail.length);
        await sock.sendMessage(chatId, {
          image: thumbnail,
          caption: menuText
        }, messageOptions);
      } else {
        console.log('Sending menu as text only');
        await sock.sendMessage(chatId, {
          text: menuText
        }, messageOptions);
      }

    } catch (error) {
      console.error('Menu Error:', error);
      await sock.sendMessage(chatId, { 
        text: `❌ *Menu Error*\n\n${error.message}`
      }, { quoted: message });
    }
  }
};

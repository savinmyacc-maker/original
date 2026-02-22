// plugins/short.js
// URL Shortener plugin (.short) using qasim-dev endpoint (tiny.cc)
// Usage:
//   .short <long_url>
//   .short https://example.com/some/very/long/link
//
// ENV (recommended):
//   QASIMDEV_APIKEY=your_real_key
//
// If you don't want env, you can hardcode API key below (not recommended).

const axios = require('axios');

const API_BASE = 'https://api.qasimdev.dpdns.org/api/shortener/tinycc';

function pickText(message) {
  const m =
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    '';

  return (m || '').trim();
}

function getQuotedText(message) {
  const ctx = message.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.quotedMessage) return '';
  return (
    ctx.quotedMessage?.conversation ||
    ctx.quotedMessage?.extendedTextMessage?.text ||
    ''
  ).trim();
}

function normalizeUrl(u) {
  let url = (u || '').trim();
  if (!url) return '';
  // if user gives "test.com" add scheme so API gets a real URL
  if (!/^https?:\/\//i.test(url)) url = 'http://' + url;
  return url;
}

function extractUrlFromText(text) {
  const t = (text || '').trim();
  if (!t) return '';

  // if user pasted multiple words, pick first that looks like a url/domain
  const parts = t.split(/\s+/).filter(Boolean);

  // prefer explicit http(s)
  const http = parts.find(p => /^https?:\/\//i.test(p));
  if (http) return http;

  // else find domain-ish token
  const dom = parts.find(p => /^[a-z0-9.-]+\.[a-z]{2,}([/?#].*)?$/i.test(p));
  if (dom) return dom;

  return parts[0] || '';
}

module.exports = {
  command: 'short',
  aliases: ['shorten', 'tiny', 'surl'],
  category: 'tools',
  description: 'Shorten a URL using qasim-dev tiny.cc shortener.',
  usage: '.short <url>  (or reply to a message containing a url)',

  async handler(sock, message, args, context = {}) {
    const chatId = context.chatId || message.key.remoteJid;

    try {
      const apiKey = process.env.QASIMDEV_APIKEY || 'qasim-dev'; // change if you want hardcode

      // Read URL from args OR from message text OR from replied text
      const argText = (args || []).join(' ').trim();
      const msgText = pickText(message);
      const quotedText = getQuotedText(message);

      const rawUrl =
        extractUrlFromText(argText) ||
        extractUrlFromText(msgText.replace(/^\.short(en)?\s*/i, '')) ||
        extractUrlFromText(quotedText);

      const longUrl = normalizeUrl(rawUrl);

      if (!longUrl) {
        return await sock.sendMessage(
          chatId,
          {
            text:
              '🔗 *URL Shortener*\n\n' +
              'Usage:\n' +
              '• `.short https://example.com/very/long/link`\n' +
              '• Reply to a message that has a link: `.short`\n'
          },
          { quoted: message }
        );
      }

      // Basic sanity check
      if (!/^https?:\/\/.{3,}$/i.test(longUrl)) {
        return await sock.sendMessage(
          chatId,
          { text: '❌ Invalid URL. Example: `.short https://test.com`' },
          { quoted: message }
        );
      }

      const res = await axios.get(API_BASE, {
        params: { apiKey, url: longUrl },
        timeout: 20000,
        validateStatus: () => true
      });

      const data = res.data;

      if (!data || data.success !== true || !data.data?.short_url) {
        const reason =
          data?.message ||
          data?.error ||
          `HTTP ${res.status}` ||
          'Unknown error';
        return await sock.sendMessage(
          chatId,
          { text: `❌ Failed to shorten.\nReason: ${reason}` },
          { quoted: message }
        );
      }

      const shortUrl = data.data.short_url;
      const original = data.data.long_url || longUrl;

      await sock.sendMessage(
        chatId,
        {
          text:
            '✅ *Shortened!*\n\n' +
            `• Long: ${original}\n` +
            `• Short: ${shortUrl}`
        },
        { quoted: message }
      );
    } catch (err) {
      console.error('[short] error:', err?.message || err);
      await sock.sendMessage(
        chatId,
        { text: '❌ Error while shortening URL. Try again later.' },
        { quoted: message }
      );
    }
  }
};

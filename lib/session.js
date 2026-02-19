const path = require('path');
const fs = require('fs');
const axios = require('axios');

/**
 * Save credentials from GitHub Gist to session/creds.json
 * @param {string} txt - Session identifier. Supported formats:
 *   - "username/MEGA-MD_<gistId>"
 *   - "MEGA-MD_<gistId>"
 *   - "<gistId>" (raw gist id)
 */
async function SaveCreds(txt) {
    const __dirname = path.dirname(__filename);

    if (!txt || typeof txt !== 'string') throw new Error('Invalid SESSION_ID provided');

    // If a full URL to gist is provided, fetch it directly
    if (/^https?:\/\//i.test(txt)) {
        try {
            const response = await axios.get(txt);
            const data = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            const sessionDir = path.join(__dirname, '..', 'session');
            if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
            const credsPath = path.join(sessionDir, 'creds.json');
            fs.writeFileSync(credsPath, data);
            return;
        } catch (error) {
            console.error('❌ Error downloading credentials from URL:', error.message);
            if (error.response) console.error('❌ Status:', error.response.status);
            throw error;
        }
    }

    // Parse formats like "owner/MEGA-MD_<id>" or "MEGA-MD_<id>" or just "<id>"
    let owner = 'stormfiber';
    let gistPart = txt;
    if (txt.includes('/')) {
        const parts = txt.split('/');
        owner = parts[0] || owner;
        gistPart = parts.slice(1).join('/');
    }

    const gistId = gistPart.replace(/^MEGA-MD_/, '');
    const gistUrl = `https://gist.githubusercontent.com/${owner}/${gistId}/raw/creds.json`;

    try {
        const response = await axios.get(gistUrl);
        const data = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

        const sessionDir = path.join(__dirname, '..', 'session');
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        const credsPath = path.join(sessionDir, 'creds.json');
        fs.writeFileSync(credsPath, data);

    } catch (error) {
        console.error('❌ Error downloading or saving credentials:', error.message);
        if (error.response) {
            console.error('❌ Status:', error.response.status);
            console.error('❌ Response:', error.response.data);
        }
        throw error;
    }
}

module.exports = SaveCreds;

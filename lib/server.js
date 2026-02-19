const express = require('express');
const { createServer } = require('http');
const packageInfo = require('../package.json');

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

const fs = require('fs');
const path = require('path');
const axios = require('axios');

app.use(express.json());

// Serve assets folder so dashboard can view uploaded images
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// Simple API to get and update manageable settings stored in data/manage.json
const managePath = path.join(__dirname, '..', 'data', 'manage.json');

app.get('/api/settings', (req, res) => {
        try {
                if (!fs.existsSync(managePath)) return res.json({});
                const raw = fs.readFileSync(managePath, 'utf8');
                const obj = JSON.parse(raw || '{}');
                res.json(obj);
        } catch (e) {
                res.status(500).json({ error: e.message });
        }
});

app.post('/api/settings', (req, res) => {
        try {
                const body = req.body || {};
                const toWrite = JSON.stringify(body, null, 2);
                fs.writeFileSync(managePath, toWrite, 'utf8');
                res.json({ ok: true });
        } catch (e) {
                res.status(500).json({ error: e.message });
        }
});

// Assets management endpoints: list/add/delete images in /assets
const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

app.get('/api/assets', (req, res) => {
    try {
        const files = fs.readdirSync(assetsDir).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
        res.json({ files });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Add image by URL: POST { url: 'https://...' }
app.post('/api/images', async (req, res) => {
    try {
        const { url } = req.body || {};
        if (!url) return res.status(400).json({ error: 'Missing url' });

        const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
        const ct = resp.headers['content-type'] || '';
        let ext = '.jpg';
        if (ct.includes('png')) ext = '.png';
        else if (ct.includes('webp')) ext = '.webp';

        const name = `uploaded_${Date.now()}${ext}`;
        const savePath = path.join(assetsDir, name);
        fs.writeFileSync(savePath, Buffer.from(resp.data));
        res.json({ ok: true, file: name });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete image: DELETE /api/images?name=filename
app.delete('/api/images', (req, res) => {
    try {
        const name = req.query.name;
        if (!name) return res.status(400).json({ error: 'Missing name' });
        const p = path.join(assetsDir, path.basename(name));
        if (!fs.existsSync(p)) return res.status(404).json({ error: 'Not found' });
        fs.unlinkSync(p);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Render dashboard HTML (shared for / and /dashboard)
function dashboardHtml(){
    return `
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <title>Bot Dashboard</title>
            <style>
                body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;background:#0b1220;color:#e6eef8}
                .wrap{max-width:900px;margin:24px auto;padding:18px;background:#071127;border-radius:12px}
                label{display:block;margin-top:12px;color:#9fb0c8}
                input[type=text], textarea{width:100%;padding:8px;border-radius:6px;border:1px solid #234}
                button{margin-top:12px;padding:10px 14px;border-radius:8px;background:#06d6a0;border:none;color:#012}
                .hint{color:#7f9fb2;font-size:0.9rem}
            </style>
        </head>
        <body>
            <div class="wrap">
                <h2>Bot Dashboard</h2>
                <p class="hint">Edit basic bot settings and image URL lists for `.menu` and `.ping`. After changing settings, restart the bot to apply globally.</p>

                <form id="frm">
                    <label>Bot Name<input type="text" id="botName"/></label>
                    <label>Bot Owner<input type="text" id="botOwner"/></label>
                    <label>Connect Note<textarea id="connectNote" rows="2"></textarea></label>
                    <label>Forwarding Score<input type="text" id="forwardingScore"/></label>
                    <label>Newsletter JID<input type="text" id="newsletterJid"/></label>
                    <label>Newsletter Name<input type="text" id="newsletterName"/></label>
                        <label>Menu Image URLs (one per line)<textarea id="menuImageUrls" rows="4"></textarea></label>
                        <label>Ping Image URLs (one per line)<textarea id="pingImageUrls" rows="4"></textarea></label>
                        <label>API Key - Cinesubz<input type="text" id="apiCinesubz"/></label>
                        <label>API Key - Movie<input type="text" id="apiMovie"/></label>
                        <button type="button" onclick="save()">Save</button>
                        <hr style="margin-top:18px;border:none;border-top:1px solid #123"/>
                        <h3>Assets</h3>
                        <label>Add image by URL<input type="text" id="addImageUrl" placeholder="https://example.com/img.jpg"/></label>
                        <button type="button" onclick="addImage()">Add Image</button>
                        <div id="assetsList" style="margin-top:12px"></div>
                </form>

                <pre id="result" style="margin-top:14px;color:#bfe">Loading...</pre>
            </div>
            <script>
                async function load(){
                    const res = await fetch('/api/settings');
                    const j = await res.json();
                    document.getElementById('botName').value = j.botName || '';
                    document.getElementById('botOwner').value = j.botOwner || '';
                    document.getElementById('connectNote').value = j.connectNote || '';
                    document.getElementById('forwardingScore').value = j.forwardingScore || '';
                    document.getElementById('newsletterJid').value = j.newsletterJid || '';
                    document.getElementById('newsletterName').value = j.newsletterName || '';
                      document.getElementById('menuImageUrls').value = (j.menuImageUrls || []).join('\n');
                      document.getElementById('pingImageUrls').value = (j.pingImageUrls || []).join('\n');
                      document.getElementById('apiCinesubz').value = (j.apiKeys && j.apiKeys.cinesubz) || '';
                      document.getElementById('apiMovie').value = (j.apiKeys && j.apiKeys.movie) || '';
                      loadAssets();
                    document.getElementById('result').textContent = 'Ready';
                }
                async function save(){
                    const body = {
                        botName: document.getElementById('botName').value,
                        botOwner: document.getElementById('botOwner').value,
                        connectNote: document.getElementById('connectNote').value,
                        forwardingScore: parseInt(document.getElementById('forwardingScore').value) || 1,
                        newsletterJid: document.getElementById('newsletterJid').value,
                        newsletterName: document.getElementById('newsletterName').value,
                        menuImageUrls: document.getElementById('menuImageUrls').value.split(/\n+/).filter(Boolean),
                        pingImageUrls: document.getElementById('pingImageUrls').value.split(/\n+/).filter(Boolean),
                        apiKeys: {
                            cinesubz: document.getElementById('apiCinesubz').value,
                            movie: document.getElementById('apiMovie').value
                        }
                    };
                    const res = await fetch('/api/settings', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
                    const j = await res.json();
                    document.getElementById('result').textContent = JSON.stringify(j, null, 2);
                }
                async function loadAssets(){
                    try{
                        const r = await fetch('/api/assets');
                        const j = await r.json();
                        const container = document.getElementById('assetsList');
                        container.innerHTML = '';
                        (j.files||[]).forEach(f=>{
                            const div = document.createElement('div');
                            div.style.padding='6px 0';
                            const deleteBtn = '<button onclick="delAsset(\'' + f + '\')">Delete</button>';
                            const viewLink = '<a style="margin-left:8px;color:#9fb" href="/assets/' + encodeURIComponent(f) + '" target="_blank">View</a>';
                            div.innerHTML = '<span style="color:#bfe">' + f + '</span> ' + deleteBtn + ' ' + viewLink;
                            container.appendChild(div);
                        });
                    }catch(e){console.log(e);}
                }

                async function addImage(){
                    const url = document.getElementById('addImageUrl').value.trim();
                    if(!url) return alert('Enter URL');
                    const res = await fetch('/api/images', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ url }) });
                    const j = await res.json();
                    if(j.ok) loadAssets(); else alert(j.error||'Failed');
                }

                async function delAsset(name){
                    if(!confirm('Delete '+name+'?')) return;
                    const res = await fetch('/api/images?name='+encodeURIComponent(name), { method: 'DELETE' });
                    const j = await res.json();
                    if(j.ok) loadAssets(); else alert(j.error||'Failed');
                }

                load();
            </script>
        </body>
        </html>
    `;
}

app.get('/dashboard', (req, res) => res.send(dashboardHtml()));
app.get('/', (req, res) => res.send(dashboardHtml()));

app.get('/process', (req, res) => {
    const { send } = req.query;
    if (!send) return res.status(400).json({ error: 'Missing send query' });
    res.json({ status: 'Received', data: send });
});

app.get('/chat', (req, res) => {
    const { message, to } = req.query;
    if (!message || !to) return res.status(400).json({ error: 'Missing message or to query' });
    res.json({ status: 200, info: 'Message received (integration not implemented)' });
});

module.exports = { app, server, PORT };


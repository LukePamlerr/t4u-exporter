const WebSocket = require('ws');
const RPC = require('discord-rpc');

const clientId = 'YOUR_CLIENT_ID'; // Replace with your Discord Application Client ID
const wss = new WebSocket.Server({ port: 8080 });
const client = new RPC.Client({ transport: 'ipc' });

client.on('ready', () => {
    console.log('[RPC] Connected to Discord');
});

client.on('error', (err) => {
    console.error('[RPC] Error:', err);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'error', message: err.message }));
        }
    });
});

wss.on('connection', (ws) => {
    console.log('[WebSocket] Client connected');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const activity = {
                details: data.details || undefined,
                state: data.state || undefined,
                assets: {},
                buttons: [],
                timestamps: {}
            };

            if (data.largeImage) activity.assets.large_image = data.largeImage;
            if (data.smallImage) activity.assets.small_image = data.smallImage;
            if (data.button1.label && data.button1.url) {
                activity.buttons.push({ label: data.button1.label, url: data.button1.url });
            }
            if (data.timer) {
                activity.timestamps.end = Math.floor(Date.now() / 1000) + data.timer;
            }

            client.setActivity(activity).then(() => {
                ws.send(JSON.stringify({ type: 'update', ...data }));
            }).catch(err => {
                ws.send(JSON.stringify({ type: 'error', message: err.message }));
            });
        } catch (err) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid data format' }));
        }
    });

    ws.on('close', () => {
        console.log('[WebSocket] Client disconnected');
    });
});

client.login({ clientId }).catch(err => {
    console.error('[RPC] Login failed:', err);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'error', message: 'Failed to connect to Discord' }));
        }
    });
});

console.log('WebSocket server running on ws://localhost:8080');

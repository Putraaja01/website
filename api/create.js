const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { username, whatsapp, specs } = req.body;

    if (!username || !whatsapp || !specs) {
        return res.status(400).json({ success: false, message: 'Data tidak lengkap!' });
    }

    // ==========================================
    // KONFIGURASI VPS & API PTERODACTYL ANDA
    // ==========================================
    const PANEL_URL = "https://thepanel.putranasution.web.id";
    const PLTA_KEY  = "ptla_ClbL66HqYT3U2BfcUsQwydERZiW5yzgSVjFxBBBRVZO"; 

    // Konfigurasi Spesifikasi RAM & CPU
    let ram = 1024, cpu = 50, disk = 10240;
    if (specs === "2GB") { ram = 2048; cpu = 100; }
    else if (specs === "4GB") { ram = 4096; cpu = 200; }
    else if (specs === "unlimited") { ram = 0; cpu = 0; disk = 0; }

    const NEST_ID = 5; // Sesuaikan Nest ID Anda di panel
    const EGG_ID = 16;  // Sesuaikan ID Egg Anda di panel
    const NODE_ID = 1; // Sesuaikan ID Node/Wings Anda di panel

    const randomPassword = "P" + Math.floor(1000 + Math.random() * 9000) + "@" + Math.random().toString(36).substring(2, 6);
    const email = username.toLowerCase() + "@autopanel.com";

    try {
        // 1. Buat User Baru di Panel Pterodactyl
        const userRes = await fetch(`${PANEL_URL}/api/application/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PLTA_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'Application/JSON'
            },
            body: JSON.stringify({
                email: email,
                username: username.toLowerCase(),
                first_name: username,
                last_name: "User",
                password: randomPassword
            })
        });

        const userData = await userRes.json();

        let clientId;
        if (userRes.ok) {
            clientId = userData.attributes.id;
        } else {
            // Jika user gagal dibuat (misal username sudah ada di panel)
            let userError = "Username sudah terpakai";
            if (userData.errors && userData.errors.length > 0) {
                userError = userData.errors.map(err => err.detail).join(', ');
            }
            return res.status(400).json({ 
                success: false, 
                message: 'Gagal buat user: ' + userError,
                debug: userData 
            });
        }

        // 2. Buat Server Baru untuk User Tersebut
        const serverPayload = {
            name: `${username} Server`,
            user: clientId,
            nest: NEST_ID,
            egg: EGG_ID,
            docker_image: "ghcr.io/pterodactyl/yolks:nodejs_18",
            startup: "npm start",
            limits: { memory: ram, swap: 0, disk: disk, io: 500, cpu: cpu },
            feature_limits: { databases: 1, backups: 1, allocations: 1 },
            allocation: { default: NODE_ID }
        };

        const serverRes = await fetch(`${PANEL_URL}/api/application/servers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PLTA_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'Application/JSON'
            },
            body: JSON.stringify(serverPayload)
        });

        const serverData = await serverRes.json();

        if (serverRes.ok) {
            return res.status(200).json({
                success: true,
                panel_url: PANEL_URL,
                username: username.toLowerCase(),
                password: randomPassword
            });
        } else {
            // Menampilkan detail error asli dari Pterodactyl jika pembuatan server ditolak
            let errorDetail = "Unknown error";
            if (serverData.errors && serverData.errors.length > 0) {
                errorDetail = serverData.errors.map(err => `${err.detail} (${err.code})`).join(', ');
            }
            
            return res.status(400).json({
                success: false,
                message: 'Gagal membuat server: ' + errorDetail,
                debug: serverData
            });
        }

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};

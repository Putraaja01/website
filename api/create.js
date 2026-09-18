const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // Hanya izinkan method POST
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
    const PLTA_KEY  = "ptla_ClbL66HqYT3U2BfcUsQwydERZiW5yzgSVjFxBBBRVZO"; // Ganti dengan PLTA Anda

    // Konfigurasi Spesifikasi RAM & CPU
    let ram = 1024, cpu = 50, disk = 10240;
    if (specs === "2GB") { ram = 2048; cpu = 100; }
    else if (specs === "4GB") { ram = 4096; cpu = 200; }
    else if (specs === "unlimited") { ram = 0; cpu = 0; disk = 0; }

    const NEST_ID = 5; // Sesuaikan Nest ID Anda
    const EGG_ID = 16;  // Sesuaikan ID Egg Anda
    const NODE_ID = 1; // Sesuaikan ID Node/Wings Anda

    const randomPassword = "P" + Math.floor(1000 + Math.random() * 9000) + "@" + Math.random().toString(36).substring(2, 6);
    const email = username.toLowerCase() + "@gmail.com";

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

        if (!userRes.ok) {
            return res.status(400).json({ 
                success: false, 
                message: 'Gagal membuat user di panel. Kemungkinan username sudah terpakai.',
                debug: userData 
            });
        }

        const clientId = userData.attributes.id;

        // 2. Buat Server Baru untuk User Tersebut
        const serverRes = await fetch(`${PANEL_URL}/api/application/servers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PLTA_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'Application/JSON'
            },
            body: JSON.stringify({
                name: `${username} Server`,
                user: clientId,
                nest: NEST_ID,
                egg: EGG_ID,
                docker_image: "ghcr.io/pterodactyl/yolks:nodejs_18",
                startup: "npm start",
                limits: { memory: ram, swap: 0, disk: disk, io: 500, cpu: cpu },
                feature_limits: { databases: 1, backups: 1, allocations: 1 },
                allocation: { default: NODE_ID }
            })
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
            return res.status(400).json({
                success: false,
                message: 'User berhasil dibuat, tetapi gagal membuat server.',
                debug: serverData
            });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan koneksi ke server VPS.' });
    }
};
                              

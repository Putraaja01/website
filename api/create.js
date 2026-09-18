const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { username, whatsapp, specs } = req.body;

    if (!username || !whatsapp || !specs) {
        return res.status(400).json({ success: false, message: 'Data tidak lengkap!' });
    }

    const PANEL_URL = "https://thepanel.putranasution.web.id";
    const PLTA_KEY  = "ptla_ClbL66HqYT3U2BfcUsQwydERZiW5yzgSVjFxBBBRVZO"; 

    let ram = 1024, cpu = 50, disk = 10240;
    const cleanSpec = specs.toUpperCase();
    
    if (cleanSpec === "1GB") { ram = 1024; cpu = 50; disk = 10240; }
    else if (cleanSpec === "2GB") { ram = 2048; cpu = 100; disk = 20480; }
    else if (cleanSpec === "3GB") { ram = 3072; cpu = 150; disk = 30720; }
    else if (cleanSpec === "4GB") { ram = 4096; cpu = 200; disk = 40960; }
    else if (cleanSpec === "5GB") { ram = 5120; cpu = 250; disk = 51200; }
    else if (cleanSpec === "6GB") { ram = 6144; cpu = 300; disk = 61440; }
    else if (cleanSpec === "7GB") { ram = 7168; cpu = 350; disk = 71680; }
    else if (cleanSpec === "8GB") { ram = 8192; cpu = 400; disk = 81920; }

    const NEST_ID = 5; 
    const EGG_ID = 16;  
    const NODE_ID = 1; 
    const fixedDocker = "ghcr.io/parkervcp/yolks:nodejs_23";

    const randomPassword = "P" + Math.floor(1000 + Math.random() * 9000) + "@" + Math.random().toString(36).substring(2, 6);
    const email = username.toLowerCase() + "@autopanel.com";

    const startupCommand = 'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; if [[ ! -z${CUSTOM_ENVIRONMENT_VARIABLES} ]]; then vars=$(echo${CUSTOM_ENVIRONMENT_VARIABLES} | tr ";" "\\n"); for line in $vars; do export $line; done fi; /usr/local/bin/${CMD_RUN};';

    try {
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

        const serverPayload = {
            name: `${username} Server`,
            user: clientId,
            nest: NEST_ID,
            egg: EGG_ID,
            docker_image: fixedDocker,
            startup: startupCommand,
            limits: { memory: ram, swap: 0, disk: disk, io: 500, cpu: cpu },
            feature_limits: { databases: 1, backups: 1, allocations: 1 },
            deploy: {
                node_ids: [parseInt(NODE_ID)],
                locations: [],
                dedicated_ip: false,
                port_range: []
            },
            environment: {
                "INST": "npm",
                "USER_UPLOAD": "0",
                "AUTO_UPDATE": "0",
                "MAIN_FILE": "index.js",
                "CMD_RUN": "index.js"
            }
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
                password: randomPassword,
                whatsapp: whatsapp
            });
        } else {
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

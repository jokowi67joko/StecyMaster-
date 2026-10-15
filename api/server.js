// File: api/server.js
const dgram = require('dgram');

export default async function handler(req, res) {
  // 1. Konfigurasi Keamanan & Caching (Vercel Edge Cache)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate');

  const { host, port = 19132 } = req.query;

  // 2. Validasi Input Dasar
  if (!host || typeof host !== 'string' || host.length > 255) {
    return res.status(400).json({ error: "Host tidak valid" });
  }
  const portNum = parseInt(port, 10);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    return res.status(400).json({ error: "Port tidak valid" });
  }

  try {
    // 3. Eksekusi Ping dengan Timeout 2 Detik (Max 2x Percobaan / Retry)
    let result = await attemptRakNetPing(host, portNum, 2000);
    return res.status(200).json(result);
  } catch (err) {
    try {
      // Coba ulang 1x jika percobaan pertama gagal (untuk mengatasi packet loss)
      let result = await attemptRakNetPing(host, portNum, 2000);
      return res.status(200).json(result);
    } catch (retryErr) {
      // Membedakan antara Timeout/Jaringan dengan masalah lainnya
      const errorMsg = retryErr.message === 'Timeout' ? 'Timeout' : 'Offline';
      return res.status(200).json({
        online: false,
        host: host,
        port: portNum,
        error: errorMsg,
        last_checked: new Date().toISOString()
      });
    }
  }
}

// Fungsi Internal: Membangun Paket UDP RakNet Unconnected Ping MCPE 0.14.x - 0.15.x
function attemptRakNetPing(host, port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');
    let isResolved = false;

    // Timer Timeout
    const timer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        client.close();
        reject(new Error('Timeout'));
      }
    }, timeoutMs);

    const startTime = Date.now();

    // Payload RakNet Unconnected Ping
    const magic = Buffer.from([0x00, 0xff, 0xff, 0x00, 0xfe, 0xfe, 0xfe, 0xfe, 0xfd, 0xfd, 0xfd, 0xfd, 0x12, 0x34, 0x56, 0x78]);
    const timeBuf = Buffer.alloc(8);
    const pingPacket = Buffer.concat([Buffer.from([0x01]), timeBuf, magic, Buffer.alloc(8)]);

    // Menangani Respons dari Server
    client.on('message', (msg) => {
      if (isResolved) return;
      
      // Jika paket balasan adalah ID_UNCONNECTED_PONG (0x1c)
      if (msg[0] === 0x1c) {
        isResolved = true;
        clearTimeout(timer);
        client.close();

        const latency = Date.now() - startTime;
        let offset = 33; // Lewati Byte ID (1), Time (8), GUID (8), Magic (16)
        
        if (msg.length > offset + 2) {
          const strLen = msg.readUInt16BE(offset);
          offset += 2;
          
          // Membaca string metadata PMMP (MCPE;MOTD;Protocol;Version;Online;Max;ID;Map;GameMode)
          const serverStr = msg.toString('utf8', offset, offset + strLen);
          const parts = serverStr.split(';');

          resolve({
            online: true,
            host: host,
            port: port,
            players: {
              online: parseInt(parts[4], 10) || 0,
              max: parseInt(parts[5], 10) || 0
            },
            version: parts[3] || 'Legacy',
            motd: parts[1] || 'Minecraft PE Server',
            latency: latency,
            last_checked: new Date().toISOString()
          });
        } else {
          reject(new Error('Invalid Data'));
        }
      }
    });

    client.on('error', (err) => {
      if (!isResolved) { isResolved = true; clearTimeout(timer); client.close(); reject(err); }
    });

    // Menembak paket UDP ke target
    client.send(pingPacket, 0, pingPacket.length, port, host, (err) => {
      if (err) {
        if (!isResolved) { isResolved = true; clearTimeout(timer); client.close(); reject(err); }
      }
    });
  });
}

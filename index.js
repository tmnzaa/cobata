const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys')
const QRCode = require('qrcode')
const P = require('pino')
const { Boom } = require('@hapi/boom')
const schedule = require('node-schedule')
const fs = require('fs-extra')
const axios = require('axios')

// === File Database ===
const dbFile = './grup.json'
let dbCache = {}

function isValidJson(content) {
  try {
    const parsed = JSON.parse(content)
    return typeof parsed === 'object' && !Array.isArray(parsed)
  } catch {
    return false
  }
}

if (!fs.existsSync(dbFile)) {
  console.warn('⚠️ File grup.json tidak ditemukan, membuat file kosong...')
  fs.writeFileSync(dbFile, '{}', 'utf-8')
}

try {
  const raw = fs.readFileSync(dbFile, 'utf-8').trim()
  dbCache = isValidJson(raw) ? JSON.parse(raw) : {}
} catch (err) {
  console.error('❌ File grup.json rusak! Reset ke kosong.')
  fs.writeFileSync(dbFile, '{}', 'utf-8')
  dbCache = {}
}

// Simpan DB ke file
function saveDB() {
  try {
    fs.writeJsonSync(dbFile, dbCache, { spaces: 2 })
  } catch (err) {
    console.error('❌ Gagal menyimpan DB:', err.message)
  }
}

let qrShown = false

// === Cache DB agar tidak delay ===
try {
  const raw = fs.readFileSync(dbFile, 'utf-8').trim()
  dbCache = raw === '' ? {} : JSON.parse(raw)
} catch (e) {
  dbCache = {}
}

async function startBot(io) {
  const projectName = process.env.PROJECT_NAME || 'default-bot';
  const sessionFolder = `./sessions/${projectName}`;
  const qrFile = `${sessionFolder}/qr.txt`;

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false
  });

  console.log(`[${projectName}] ▶️ Bot sedang dijalankan...`);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log(`[${projectName}] 📲 QR tersedia, scan sekarang:`);

      try {
        const qrDataUrl = await QRCode.toDataURL(qr);
        io.to(projectName).emit('qr', qrDataUrl); // 🔥 Emit QR ke client via socket
        await fs.ensureDir(sessionFolder);
        await fs.writeFile(qrFile, qrDataUrl, 'utf-8');
      } catch (err) {
        console.error(`[${projectName}] ❌ Gagal generate QR:`, err.message);
      }
    }

    if (connection === 'open') {
      console.log(`[${projectName}] ✅ Bot berhasil terhubung ke WhatsApp!`);
      io.to(projectName).emit('connected'); // 🔥 Emit koneksi sukses ke client

      if (fs.existsSync(qrFile)) {
        fs.unlinkSync(qrFile);
      }
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const reconnect = reason !== DisconnectReason.loggedOut;
      console.log(`[${projectName}] ❌ Bot terputus (${reason}), reconnect: ${reconnect}`);

      if (!reconnect) {
        console.log(`[${projectName}] ⚠️ Logout detected. Menghapus session...`);
        await fs.remove(sessionFolder);
      }

      if (reconnect) startBot(io); // 🔁 Rekoneksi tetap passing io
    }
  })

  // 📥 Message handler
sock.ev.on('messages.upsert', async ({ messages }) => {
  const msg = messages[0]
  if (!msg.message) return
  if (!msg.key.remoteJid || msg.key.id.startsWith('BAE5') || msg.key.fromMe) return

  const from = msg.key.remoteJid
  const sender = msg.key.participant || msg.key.remoteJid
let db = dbCache

  const fitur = db[from]

  // ✅ ANTIPOLLING
  if (fitur?.antipolling && msg.message.pollCreationMessage) {
    console.log('🚫 Deteksi polling dari:', sender)

    await sock.sendMessage(from, {
      text: `❌ @${sender.split('@')[0]} dilarang kirim polling di grup ini.`,
      mentions: [sender]
    })

    try {
      await sock.sendMessage(from, {
        delete: {
          remoteJid: from,
          fromMe: false,
          id: msg.key.id,
          participant: sender
        }
      })
      console.log('✅ Polling berhasil dihapus.')
    } catch (err) {
      console.error('❌ Gagal hapus polling:', err)
    }
    return
  }

  // Handler lain
  try {
    require('./grup')(sock, msg)
    require('./private')(sock, msg)
  } catch (err) {
    console.error('💥 Error handle pesan:', err)
  }
})

sock.ev.on('group-participants.update', async (update) => {
  try {
    const fitur = dbCache[update.id]
    if (!fitur || (!fitur.welcome && !fitur.leave)) return

    const metadata = await sock.groupMetadata(update.id)
    const groupName = metadata.subject
    const imagePath = './ronaldo.jpg'

    for (const jid of update.participants) {
      // Cari nama user, fallback ke tag
      let name = `@${jid.split('@')[0]}`
      try {
        const contact = await sock.onWhatsApp(jid)
        name = contact?.[0]?.notify || name
      } catch {}

      const tagUser = `@${jid.split('@')[0]}`
      const mentions = [jid]

      // 🟢 WELCOME
      if (update.action === 'add' && fitur.welcome) {
        const teks = `👋 *${name}* (${tagUser}) baru saja bergabung ke *${groupName}*.\n\n📜 _"Aturan bukan buat membatasi, tapi buat menjaga kenyamanan bersama."_ \n\nSebelum mulai interaksi atau promosi, silakan *baca rules di deskripsi grup*.\n\n📌 Di sini kita jaga suasana tetap rapi dan nyaman. Hormati aturan, hargai sesama.\n\n— Bot Taca standby. 🤖`

        await sock.sendMessage(update.id, {
          image: fs.readFileSync(imagePath),
          caption: teks,
          mentions
        })
      }

      // 🔴 LEAVE
      if (update.action === 'remove' && fitur.leave) {
        const teks = `👋 *${name}* telah meninggalkan grup.\n\n_"Tidak semua perjalanan harus diselesaikan bersama. Terima kasih sudah pernah menjadi bagian dari *${groupName}*."_

— Bot Taca`
        await sock.sendMessage(update.id, {
          image: fs.readFileSync(imagePath),
          caption: teks,
          mentions
        })
      }
    }
  } catch (err) {
    console.error('❌ Error welcome/leave:', err)
  }
})

// Pastikan fungsi ini ditaruh sebelum digunakan
function padTime(number) {
  return number.toString().padStart(2, '0')
}

schedule.scheduleJob('* * * * *', async () => {
  const now = new Date()
  const jam = `${padTime(now.getHours())}.${padTime(now.getMinutes())}`
  console.log('⏰ Cek waktu sekarang:', jam)

  for (const id in dbCache) {
    const fitur = dbCache[id]
    if (!fitur) continue

    try {
      const metadata = await sock.groupMetadata(id).catch(e => {
        console.warn(`⚠️ Gagal ambil metadata grup ${id}: ${e.message || e}`)
        return null
      })
      if (!metadata) continue

      const botNumber = sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
      const botParticipant = metadata.participants?.find(p => p.id === botNumber)
      const isBotAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin'

      if (!isBotAdmin) {
        console.log(`❌ Bot bukan admin di grup ${id}, skip.`)
        continue
      }

      const openTime = fitur.openTime?.padStart(5, '0')
      const closeTime = fitur.closeTime?.padStart(5, '0')

      // Proses OPEN
      if (openTime === jam) {
        try {
          await sock.groupSettingUpdate(id, 'not_announcement')
          await sock.sendMessage(id, {
            text: `✅ Grup dibuka otomatis jam *${openTime}*`
          })
          console.log(`✅ Grup ${id} dibuka jam ${openTime}`)
        } catch (e) {
          console.warn(`⚠️ Gagal buka grup ${id}: ${e.message || e}`)
        }
        delete fitur.openTime // Hapus setelah diproses
      }

      // Proses CLOSE
      if (closeTime === jam) {
        try {
          await sock.groupSettingUpdate(id, 'announcement')
          await sock.sendMessage(id, {
            text: `🔒 Grup ditutup otomatis jam *${closeTime}*`
          })
          console.log(`🔒 Grup ${id} ditutup jam ${closeTime}`)
        } catch (e) {
          console.warn(`⚠️ Gagal tutup grup ${id}: ${e.message || e}`)
        }
        delete fitur.closeTime // Hapus setelah diproses
      }

    } catch (err) {
      console.error(`❌ Gagal update setting grup ${id}:`, err.message || err)
    }
  }

  saveDB()
})

}

// 🛠 Global error
process.on('unhandledRejection', err => {
  console.error('💥 Unhandled Rejection:', err)
})

module.exports = { startBot };

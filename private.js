const fs = require('fs-extra')
const path = './data_user.json'
if (!fs.existsSync(path)) fs.writeJsonSync(path, {})

// 🎩 Nomor Owner Bot
const OWNER_NUM = ['62895379065009', '6285179690350']

module.exports = async (sock, msg) => {
  const from = msg.key.remoteJid
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
  if (from.endsWith('@g.us')) return // cuma buat chat pribadi yaa 🤖

  const db = fs.readJsonSync(path)
  db[from] = db[from] || {}

 // 💌 Pesan sambutan pertama kali
if (!db[from].perkenalan) {
  db[from].perkenalan = true
  fs.writeJsonSync(path, db, { spaces: 2 })
  return sock.sendMessage(from, {
    text: `📋 *MENU UTAMA - TACATIC BOT 04*\n\n🌟 Aku bisa bantu kamu jagain grup lohh~\nPilih aja yang kamu mau:\n\n• 🎮 _.fitur_ – Liat semua kekuatan botku!\n• 💸 _.sewa_ – Info sewa (murce!)\n• 🙋‍♂️ _.owner_ – Chat abang owner botku 💌\n• 🤖 _.maujadibot_ – Ingin jadi bot juga?`
  })
}

  // 📋 Menu utama lucu
  if (text.toLowerCase() === '.menu') {
    return sock.sendMessage(from, {
      text: `📋 *MENU UTAMA - TACATIC BOT 04*\n\n🌟 Aku bisa bantu kamu jagain grup lohh~\nPilih aja yang kamu mau:\n\n• 🎮 _.fitur_  – Liat semua kekuatan botku!\n• 💸 _.sewa_   – Info sewa (murce!)\n• 🙋‍♂️ _.owner_ – Chat abang owner botku 💌\n• 🤖 _.maujadibot_ – Ingin jadi bot juga?`
    })
  }

  // 💎 Info Jadi Bot Sendiri (Versi Premium dengan Harga Baru)
if (text.toLowerCase() === '.maujadibot') {
  return sock.sendMessage(from, {
    text: `💎 *MAU JADI BOT SENDIRI?*

Kamu bisa punya *Bot WhatsApp Profesional* seperti *Tacatic 04*, dengan fitur lengkap dan tampil keren! Cocok buat jagain grup pribadi, komunitas, bahkan bisa kamu sewakan lagi untuk cuan! 💸

🚀 *FITUR YANG AKAN KAMU DAPATKAN:*
• Auto jaga grup 24 jam (anti spam, antilink, welcome, dll)
• Full Source Code premium (bukan hasil comot YouTube)
• Custom nama bot dan watermark pribadi
• Panduan lengkap setup langsung di HP (via Termux)
• Bisa di-clone & aktifkan sendiri
• Gratis bantuan pemasangan sampai bot nyala!

⚠️ *SYARAT JADI BOT SENDIRI:*
• WAJIB punya **2 nomor WhatsApp**:
  1. Nomor untuk login bot
  2. Nomor owner untuk kontrol perintah
(Bot tidak disarankan dijalankan dengan hanya 1 nomor.)

📱 *PERANGKAT WAJIB:*  
Script ini *hanya bisa dijalankan lewat aplikasi Termux* di Android.

---

❗ *KENAPA SCRIPT INI BERBAYAR DAN MAHAL?*
• Dibuat manual dari nol, bukan copas YouTube
• Kode bersih, sudah diuji langsung di banyak grup aktif
• Support dan update diberikan langsung oleh pembuat
• Fitur stabil dan bisa kamu kembangkan sendiri
Jadi, kamu nggak beli “kode asal comot”, tapi beli sistem profesional 🤝

---

💰 *HARGA SCRIPT:*
• 35K = *Basic Version* – Full Source Code TANPA bisa rename (Pakai Nama Tacatic) 
• 60K = *Premium Version* – Full Source Code + Rename Bot (Pakai Nama Kamu) + Panduan Lengkap Termux + Support bantu pasang

📜 *Lihat daftar fitur lengkap?*
Ketik: *.fitur*

📞 Serius ingin jadi bot sendiri dan punya sistem kayak ini?
Langsung ketik *.owner* untuk tanya-tanya atau order sekarang juga!`
  })
}

  // 🛡️ List fitur jaga grup + tambahan lainnya
if (text === '.fitur') {
  return sock.sendMessage(from, {
    text: `🛡️ *FITUR JAGA GRUP – TACATIC BOT 04*

Aku bisa bantu kamu jagain grup dari yang nakal-nakal 😼:

• 🚫 _.antilink1 on/off_ – Hapus link
• 🚷 _.antilink2 on/off_ – Hapus + Tendang!
• 📢 _.antipromosi on/off_ – Auto hapus iklan
• 🤬 _.antitoxic on/off_ – Bersihin kata kasar
• 🗳️ _.antipolling on/off_ – Auto hapus polling WhatsApp
• 🎉 _.welcome on/off_ – Sambutan lucu untuk member baru
• 🔚 _.leave on/off_ – Aktifkan kirim pesan saat member keluar
• 📄 _.setdesc_ – Ubah deskripsi grup
• 🗣️ _.tagall_ – Panggil semua member
• 👢 _.kick_ – Tendang member (sopan)
• 👑 _.promote_ – Angkat jadi admin
• 🧹 _.demote_ – Turunin admin
• 🔓 _.open / .open 20.00_ – Buka grup (otomatis juga bisa!)
• 🔒 _.close / .close 22.00_ – Tutup grup (sesuai jam juga bisa!)
• 📴 _.dnd on/off_ – Mode Do Not Disturb, bot abaikan command member biasa

🎨 *FITUR LAINNYA*:
• 🖼️ _.stiker_ – Kirim/reply gambar lalu ketik ini
• 🔤 _.addbrat teks_ – Buat stiker teks brat
• ❌ _.removebg_ – Hapus background gambar otomatis
• 📷 _.hd_ – Perjelas dan HD-kan gambar otomatis
• 🎵 _.tiktok <link>_ – Download video TikTok tanpa watermark

👾 Powered by *Tacatic 04*`
  }, { quoted: msg });
}

  // 💸 Info sewa bot
if (text === '.sewa') {
  return sock.sendMessage(from, {
    text: `📦 *SEWA TACATIC BOT 04*

Bot ini punya fitur:
• Auto hapus link & iklan
• Auto tendang member toxic/spam
• Welcome + stiker custom (.stiker, .addbrat)
• Buka/tutup grup otomatis
• Menu lengkap ketik: .menu
• Bisa Remove bg & hd
• Fitur lengkap

💰 *Harga Sewa:*
• 3K = 1 Minggu
• 5K = 1 Bulan
• 7K = 2 Bulan
• 10K = Permanen

🛠️ *Cara Aktifkan Bot:*
1. Tambahkan bot ke grup
2. Jadikan bot sebagai admin
3. Chat owner untuk aktifkan bot
4. Bot aktif

⚠️ Aktif hanya kalau bot jadi admin & owner grup aktifkan.
🔑 Jika ingin sewa, ketik *.mausewa*`
  })
}

// 💳 Info sistem transfer sewa bot
if (text === '.mausewa') {
  return sock.sendMessage(from, {
    text: `💳 *SISTEM PEMBAYARAN SEWA BOT TACATIC 04*

📦 Harga:
• 3K = 1 Minggu
• 5K = 1 Bulan
• 7K = 2 Bulan
• 10K = Permanen

🔁 Transfer bisa via:
• .dana
• .gopay
• .qris

Setelah transfer, ketik .owner untuk aktivasi bot.`
  })
}

// 💰 DANA
if (text === '.dana') {
  return sock.sendMessage(from, {
    text: `💰 *PEMBAYARAN DANA*\n\nSilakan transfer ke:\n📲 081334715988 a.n -\n\nSetelah transfer, ketik .owner untuk aktivasi bot.`
  })
}

// 💰 GOPAY
if (text === '.gopay') {
  return sock.sendMessage(from, {
    text: `💰 *PEMBAYARAN GOPAY*\n\nSilakan transfer ke:\n📲 0895398620405 a.n -\n\nSetelah transfer, ketik .owner untuk aktivasi bot.`
  })
}

// Kirim QRIS saat user ketik .qris
if (text.toLowerCase() === '.qris') {
  const qrisPath = './qris.png'
  if (fs.existsSync(qrisPath)) {
    await sock.sendMessage(from, {
      image: fs.readFileSync(qrisPath),
      caption: `📷 *PEMBAYARAN VIA QRIS*\n\nSilakan scan QR di atas untuk membayar.\n\n✅ Setelah bayar, ketik *.owner* untuk aktivasi.`
    })
  } else {
    await sock.sendMessage(from, {
      text: `❌ File QRIS tidak ditemukan. Pastikan file *qris.png* ada di folder bot.`
    })
  }
}

 // 👤 Kirim Kontak Owner
if (text === '.owner') {
  // Loop kirim vCard untuk semua owner
  for (const nomor of OWNER_NUM) {
    const vcard = `
BEGIN:VCARD
VERSION:3.0
FN:Owner Tacatic 04
ORG:TACATIC BOT;
TEL;type=CELL;type=VOICE;waid=${nomor}:${nomor}
END:VCARD`;

    await sock.sendMessage(from, {
      contacts: {
        displayName: "Owner Tacatic 04",
        contacts: [{ vcard }]
      }
    });
  }

  return sock.sendMessage(from, {
    text: `📱 Berikut kontak *Owner Tacatic 04*\n\nSilakan chat kalau kamu butuh bantuan, sewa, atau ingin jadi bot juga ya~`,
    quoted: msg
  });
}

  // 🔍 Cek grup aktif - hanya untuk OWNER
if (text === '.cekgrup') {
  const sender = (msg.key.participant || from || '').split('@')[0]

  // ✅ Perbaikan: pakai includes karena OWNER_NUM adalah array
  if (!OWNER_NUM.includes(sender)) {
    return sock.sendMessage(from, { text: '❌ Fitur khusus Owner Bot.' });
  }

  const grupPath = './grup.json'
  if (!fs.existsSync(grupPath)) fs.writeJsonSync(grupPath, {})

  const grupDb = fs.readJsonSync(grupPath)
  let hasil = ''
  let no = 1

  for (const id in grupDb) {
    const data = grupDb[id]
    if (data.expired || data.permanen) {
      hasil += `\n${no++}. ${data.nama || 'Tanpa Nama'}\n🆔 ${id}\n📅 Aktif: ${data.permanen ? 'PERMANEN' : data.expired}`
    }
  }

  if (!hasil) hasil = '📭 Tidak ada grup aktif terdaftar.'

  return sock.sendMessage(from, {
    text: `📊 *Daftar Grup Aktif Tacatic Bot:*\n${hasil}`
  })
}
  
}

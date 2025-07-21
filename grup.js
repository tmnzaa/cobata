const fs = require('fs-extra');
const dbFile = './grup.json';
const strikeFile = './strike.json';
const Jimp = require('jimp');
const path = require('path');
const { exec } = require('child_process');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

if (!fs.existsSync(dbFile)) fs.writeJsonSync(dbFile, {});
if (!fs.existsSync(strikeFile)) fs.writeJsonSync(strikeFile, {});
global.strikeCache = fs.readJsonSync(strikeFile); // ⏱️ baca sekali saja saat pertama
if (!global.lastLinkTime) global.lastLinkTime = {}

const tambahHari = (jumlah) => {
  const date = new Date();
  date.setDate(date.getDate() + jumlah);
  return date.toISOString().split('T')[0];
};

const kataKasar = [
  // Kata kasar umum (Indonesia)
  'jancok', 'anjing', 'babi', 'kontol', 'memek', 'pantek',
  'brengsek', 'bangsat', 'goblok', 'tolol', 'tai',
  'monyet', 'ngentot', 'kampret', 'sinting', 'idiot',
  'asu', 'bangke', 'keparat', 'pecun', 'bencong', 'jablay',

  // Bahasa Inggris & universal
  'fuck', 'shit', 'bitch', 'asshole', 'dick', 'bastard', 'fucker',

  // 18+ / pornografi
  'bokep', 'porno', 'sex', 'sange', 'okep', 'colmek', 'masturbasi',
  'ngocok', 'peju', 'sperma', 'vagina', 'pantat', 'payudara', 'boobs',
  'bugil', 'mesum', 'nude', 'pornhub', 'xnxx', 'tiktok 18', 'jav',

  // Variasi ejaan (untuk akali sensor)
  'mem3k', 'k0ntol', 'p4ntek', 's3x', 's4nge', 'g0bl0k', 'b4bi',
  'm3mek', 'puk1mak', 'anj1ng', 't0lol', 'bangs4t', 'idi0t'
];


module.exports = async (sock, msg) => {
  const from = msg.key.remoteJid
  if (!from.endsWith('@g.us')) return

  const sender = msg.key.participant || msg.key.remoteJid;
  const getTextFromMsg = (msg) => {
  const m = msg.message;
  if (!m) return '';

  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
  if (m.imageMessage?.caption) return m.imageMessage.caption;
  if (m.videoMessage?.caption) return m.videoMessage.caption;
  if (m.buttonsMessage?.contentText) return m.buttonsMessage.contentText;
  if (m.templateMessage?.hydratedTemplate?.hydratedContentText)
    return m.templateMessage.hydratedTemplate.hydratedContentText;

  // ✳️ Ini penting untuk .afk tombol (inline button / hydrated buttons)
  if (
    m.templateMessage?.hydratedTemplate?.hydratedButtons &&
    Array.isArray(m.templateMessage.hydratedTemplate.hydratedButtons)
  ) {
    for (const btn of m.templateMessage.hydratedTemplate.hydratedButtons) {
      if (btn?.buttonText?.displayText) {
        return btn.buttonText.displayText;
      }
    }
  }

  return '';
};
let text = getTextFromMsg(msg);
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const isCommand = text.startsWith('.');
  const isAfk = text.toLowerCase().startsWith('.afk');

  // ⛔ Hapus .menu dari allowedForAll, biar .menu bisa dibedain member/admin
const allowedForAll =['.stiker', '.addbrat', '.removebg', '.hd', '.tiktok', '.bratv2'];
  if (isCommand && allowedForAll.some(cmd => text.startsWith(cmd))) {
    const memberHandler = require('./member');
    await memberHandler(sock, msg, text, from);
    return;
  }

  global.groupCache = global.groupCache || {}
let metadata = global.groupCache[from]

if (!metadata || Date.now() - metadata._cachedAt > 300000) {
  try {
    metadata = await sock.groupMetadata(from)
    metadata._cachedAt = Date.now()
    global.groupCache[from] = metadata
  } catch (err) {
    return // jangan spam console
  }
}

 const OWNER_BOT = [
  '62895379065009@s.whatsapp.net',
  '6285179690350@s.whatsapp.net' // ← ganti dengan nomor owner ke-2
];

const groupOwner = metadata.owner || metadata.participants.find(p => p.admin === 'superadmin')?.id;
const isGroupOwner = sender === groupOwner;
const isBotOwner = OWNER_BOT.includes(sender);
const isOwner = isBotOwner || isGroupOwner;

const isAdmin = ['admin', 'superadmin'].includes(metadata.participants.find(p => p.id === sender)?.admin);
const botNumber = sock.user.id?.replace(/:\d+/, '')?.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
const isPolling = JSON.stringify(msg.message || {}).includes('pollCreationMessage');

const db = global.dbCache || fs.readJsonSync(dbFile);
global.dbCache = db;
db[from] = db[from] || {};
db[from].nama = metadata.subject;
const fitur = db[from];
db[from].dnd = db[from].dnd || false;
fs.writeJsonSync(dbFile, db, { spaces: 2 })

const now = new Date();
const isBotAktif = fitur.permanen || (fitur.expired && new Date(fitur.expired) > now);

if (fitur.antipolling && isPolling && isBotAktif && !isAdmin && !isOwner) {
  await sock.sendMessage(from, { delete: msg.key });

  const strikeDB = global.strikeCache;
  strikeDB[from] = strikeDB[from] || {};
  strikeDB[from][sender] = strikeDB[from][sender] || 0;
  strikeDB[from][sender] += 1;

  if (strikeDB[from][sender] >= 20) {
    await sock.groupParticipantsUpdate(from, [sender], 'remove');
    delete strikeDB[from][sender];
  }

await fs.writeJson(strikeFile, strikeDB, { spaces: 2 })
global.strikeCache = strikeDB; // update cache biar tetap sinkron
  return;
}

const isBotAdmin = metadata.participants.find(p => p.id === botNumber)?.admin;

if (mentions.includes(botNumber) && !isCommand) return;

if (['.aktifbot3k', '.aktifbot5k', '.aktifbot7k', '.aktifbotper'].includes(text)) {
  if (!isBotAdmin) {
    return sock.sendMessage(from, {
      text: '⚠️ Aku harus jadi *Admin Grup* dulu sebelum bisa diaktifkan!'
     }, { quoted: msg });
  }

  if (!isOwner) {
    return sock.sendMessage(from, {
      text: '⚠️ Hanya *Owner Bot* yang bisa mengaktifkan bot ini!'
    }, { quoted: msg });
  }

  const now = new Date();
  const expiredDate = fitur.expired ? new Date(fitur.expired) : null;

  if (fitur.permanen || (expiredDate && expiredDate >= now)) {
    return sock.sendMessage(from, {
      text: `🟢 *Bot sudah aktif di grup ini!*\n🆔 Grup ID: *${from}*\n📛 Nama Grup: *${fitur.nama || 'Tidak tersedia'}*\n📅 Aktif sampai: *${fitur.permanen ? 'PERMANEN' : fitur.expired}*`
    });
  }

  if (text === '.aktifbot3k') fitur.expired = tambahHari(7);
  if (text === '.aktifbot5k') fitur.expired = tambahHari(30);
  if (text === '.aktifbot7k') fitur.expired = tambahHari(60);

  if (text === '.aktifbotper') {
    if (!isOwner) {
      return sock.sendMessage(from, {
        text: '❌ Hanya *Owner Bot* yang bisa aktifkan secara permanen!'
       }, { quoted: msg });
    }
    fitur.permanen = true;
    fitur.expired = null;
  }

fs.writeJsonSync(dbFile, db, { spaces: 2 })

  return sock.sendMessage(from, {
    text: `✅ *Tacatic Bot 04* berhasil diaktifkan!\n🆔 Grup ID: *${from}*\n📛 Nama Grup: *${fitur.nama || 'Tidak tersedia'}*\n📅 Masa aktif: *${fitur.permanen ? 'PERMANEN' : fitur.expired}*`
  }, { quoted: msg });
}

const fiturBolehMember = ['.menu', '.stiker', '.addbrat', '.removebg', '.hd', '.tiktok', '.bratv2', '.hdv2',];
  const fiturHanyaAdmin = ['.antilink1', '.antilink2', '.antipromosi', '.antitoxic', '.welcome', '.leave', '.polling', '.tagall', '.kick', '.promote', '.demote', '.open', '.close', '.cekaktif', '.hapus'];

  const cmdUtama = text.trim().split(' ')[0].toLowerCase()
  const fullCmd = text.trim().toLowerCase()

  // ⛔ Blokir semua fitur jika bot sudah aktif tapi belum jadi admin
if (isBotAktif && !isBotAdmin) {
  return sock.sendMessage(from, {
    text: '🚫 *Bot sudah aktif* di grup ini,\ntapi belum dijadikan *Admin Grup*.\n\nMohon jadikan aku admin dulu agar bisa menjalankan fitur-fitur keamanan dan otomatis!'
  }, { quoted: msg });
}

 const allowedCommands = [
  '.menu', '.statusbot', '.aktifbot3k', '.aktifbot5k', '.aktifbot7k', '.aktifbotper',
  '.antilink1 on', '.antilink1 off', '.antilink2 on', '.antilink2 off',
  '.antipromosi on', '.antipromosi off', '.antitoxic on', '.antitoxic off',
  '.antipolling on', '.antipolling off',
  '.welcome on', '.welcome off', '.open', '.close', '.tagall', '.kick',
  '.promote', '.demote', '.cekaktif', '.stiker', '.addbrat', '.hd', '.hdv2', '.removebg', '.bratv2',
  '.setdesc', '.leave on', '.leave off', '.polling on', '.polling off',
  '.afk', '.dnd on', '.dnd off',
  '.hapus' // ✅ tambahkan ini di bagian akhir atau urut abjad
];
  if (isCommand && !allowedCommands.some(cmd => fullCmd.startsWith(cmd))) return
  const isCmdValid = allowedCommands.some(cmd => text.toLowerCase().startsWith(cmd));

  if (!isBotAktif) {
    if (isCommand && fiturBolehMember.includes(cmdUtama)) {
      return sock.sendMessage(from, {
        text: `⚠️ Bot belum aktif di grup ini.\n\nMinta *Owner Grup* aktifkan dengan:\n• .aktifbot3k (1 minggu)\n• .aktifbot5k (1 bulan)\n• .aktifbot7k (2 bulan)\n• .aktifbotper (permanen)`
      }, { quoted: msg })
    }
    if (isCommand) return
  }

  if (isCommand && fiturHanyaAdmin.includes(cmdUtama.replace(/ .*/, '')) && !isAdmin && !isOwner) {
    return sock.sendMessage(from, {
      text: '⚠️ Fitur ini hanya bisa digunakan oleh *Admin Grup*!'
    }, { quoted: msg })
  }

  if (isCommand && (isAdmin || isOwner) && fiturHanyaAdmin.includes(cmdUtama.replace(/ .*/, '')) && !isBotAdmin) {
    return sock.sendMessage(from, {
      text: '🚫 Bot belum jadi *Admin Grup*, fitur admin tidak bisa digunakan.'
    }, { quoted: msg })
  }

  if (isCommand) {
  // Jika DND aktif, tapi command .afk, jangan blok
  if (db[from].dnd && !text.startsWith('.afk')) {
    if (!isAdmin && !isOwner) {
      await sock.sendMessage(from, {
        text: '⚠️ Mode *Do Not Disturb* sedang aktif.\nBot tidak akan merespon command dari member biasa.'
      }, { quoted: msg });
      return;
    }
  }
}

// Ambil isi teks dari pesan utama
text = msg.message?.conversation ||
  msg.message?.extendedTextMessage?.text ||
  msg.message?.imageMessage?.caption ||
  msg.message?.videoMessage?.caption ||
  msg.message?.documentMessage?.caption ||
  msg.message?.buttonsResponseMessage?.selectedButtonId ||
  msg.message?.templateButtonReplyMessage?.selectedId ||
  '';

// Ambil teks dari pesan yang di-reply
const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
const quotedMsg = contextInfo?.quotedMessage;
let replyText = '';

if (quotedMsg) {
  if (quotedMsg.conversation) replyText = quotedMsg.conversation;
  else if (quotedMsg.extendedTextMessage?.text) replyText = quotedMsg.extendedTextMessage.text;
  else if (quotedMsg.imageMessage?.caption) replyText = quotedMsg.imageMessage.caption;
  else if (quotedMsg.videoMessage?.caption) replyText = quotedMsg.videoMessage.caption;
}

// Gabungkan isi text dan reply untuk analisis
const combinedText = `${text}\n${replyText}`;

// Cek deteksi terhadap link, polling dengan link, promo dan toxic
const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|chat\.whatsapp\.com\/[A-Za-z0-9]+)/i;
const isLink = linkRegex.test(combinedText);
const isPollingWithLink = isPolling && linkRegex.test(combinedText);
const isPromo = /(slot|casino|chip|jud[iy]|judol|bokep( viral)?|porno|sex|sange|sell apk( mod)?|apk( premium| mod)?|jasa bug|bug jasa|jasa suntik|suntik|suntik sosmed|suntik (tiktok|ig|instagram)|jual bokep|jual video bokep|nokos|unchek|okep|bocil|viral)/i.test(combinedText);
const toxicRegex = new RegExp(kataKasar.join('|'), 'i');
const isToxic = toxicRegex.test(combinedText);


// ⛔ Prioritaskan filter sebelum semua pengecekan command
if (isBotAktif && !isAdmin && !isOwner) {
  try {
   const strikeDB = global.strikeCache;
    strikeDB[from] = strikeDB[from] || {}
    strikeDB[from][sender] = strikeDB[from][sender] || 0

    const tambahStrike = async () => {
      strikeDB[from][sender] += 1
 await fs.writeJson(strikeFile, strikeDB, { spaces: 2 })
global.strikeCache = strikeDB; // update cache biar tetap sinkron

      if (strikeDB[from][sender] >= 20) {
        await sock.groupParticipantsUpdate(from, [sender], 'remove')
        delete strikeDB[from][sender]
 await fs.writeJson(strikeFile, strikeDB, { spaces: 2 })
global.strikeCache = strikeDB; // update cache biar tetap sinkron
      }
    }

   const isAfkLink = text.toLowerCase().includes('.afk') && (isLink || isPollingWithLink)

    // 🚫 AntiLink 1: Hapus pesan + tambah strike
if (fitur.antilink1 && (isLink || isPollingWithLink)) {
  const now = Date.now();
  const last = global.lastLinkTime?.[sender] || 0;

  // Jangan proses kalau pesan ini datang terlalu cepat setelah link sebelumnya
  if (now - last < 1500) {
    await sock.sendMessage(from, { delete: msg.key });
    return;
  }

  global.lastLinkTime[sender] = now; // Simpan waktu kirim link terakhir

  await sock.sendMessage(from, { delete: msg.key });
  await tambahStrike();
  return;
}

// 🚫 AntiLink 2: Hapus pesan + langsung tendang
if (fitur.antilink2 && (isLink || isPollingWithLink)) {
  await sock.sendMessage(from, { delete: msg.key });
  await sock.groupParticipantsUpdate(from, [sender], 'remove');

  // Hapus data strike jika ada
  if (strikeDB[from]?.[sender]) {
    delete strikeDB[from][sender];
   await fs.writeJson(strikeFile, strikeDB, { spaces: 2 })
    global.strikeCache = strikeDB; // update cache
  }
  return;
}

// 🚫 Anti Promosi
if (fitur.antipromosi && isPromo) {
  await sock.sendMessage(from, { delete: msg.key });
  await tambahStrike();
}

// 🚫 Anti Toxic
if (fitur.antitoxic && isToxic) {
  await sock.sendMessage(from, { delete: msg.key });
  await tambahStrike();
}

  } catch (err) {
    console.error('❌ Filter error:', err)
  }
}

  // 📋 MENU KHUSUS UNTUK MEMBER / ADMIN / OWNER
if (text === '.menu') {
  if (isAdmin || isOwner) {
    return sock.sendMessage(from, {
      text: `╔═══🎀 *TACATIC BOT 04 - MENU FITUR* 🎀═══╗

📛 *FITUR KEAMANAN*:
• 🚫 _.antilink1 on/off_  → Hapus link masuk
• 🚷 _.antilink2 on/off_  → Hapus link + tendang user
• 📢 _.antipromosi on/off_  → Blok iklan dan spam
• 🤬 _.antitoxic on/off_  → Bersihin kata-kata kasar
• 📊 _.antipolling on/off_ → Hapus polling yang dikirim

🎉 *FITUR SOSIAL & INTERAKSI*:
• 🎉 _.welcome on/off_  → Sambutan buat member baru
• 📴 _.leave on/off_ → Kirim pesan saat member keluar
• 🗣️ _.tagall_  → Mention semua member aktif
• 👢 _.kick_  → Tendang member (admin only)

🛠️ *FITUR MANAJEMEN GRUP*:
• 👑 _.promote_ → Jadikan member jadi admin
• 🧹 _.demote_ → Turunin admin
• 🔓 _.open_ / _.open 20.00_ → Buka grup / jadwal buka
• 🔒 _.close_ / _.close 22.00_ → Tutup grup / jadwal tutup
• 📄 _.setdesc_ → Ubah deskripsi grup
• 🧽 _.hapus_ → Hapus pesan member
• 💡 _.cekaktif_ → Cek fitur aktif
• 📴 _.dnd on/off_ → Bot tidak akan merespon perintah dari member biasa

📊 *FITUR LAINNYA*:
• 🖼️ _.stiker_        → Buat stiker dari gambar
• 🔤 _.addbrat teks_  → Buat stiker teks brat
• 🔤 _.bratv2 teks_  → Buat stiker teks brat
• 📷 _.hd_            → Ubah gambar jadi HD
• 🧼 _.removebg_      → Hapus background gambar
• 🎵 _.tiktok <link>_ → Download video TikTok tanpa watermark

📌 *Catatan*:
– Hanya admin atau owner grup yang bisa akses semua fitur.
– Pastikan bot sudah dijadikan admin supaya bisa bekerja maksimal.

╚═════════════════════════╝`
    }, { quoted: msg });
  } else {
    return sock.sendMessage(from, {
      text: `🎀 *MENU MEMBER – TACATIC BOT 04* 🎀

🛠️ *Fitur yang bisa kamu gunakan:*

• 🖼️ _.stiker_  
→ Kirim atau reply gambar, lalu ketik _.stiker_

• 📷 _.hd_  
→ Ubah gambar jadi lebih tajam dan cerah

• 🧼 _.removebg_  
→ Hapus background gambar

• 🔤 _.addbrat teks_  
→ Buat stiker teks lucu  
Contoh: _.addbrat Selamat ulang tahun_

• 🔤 _.bratv2 teks_  
→ Buat stiker teks elegan 
Contoh: _.bratv2 haloo gais_

✨ Nikmati fitur seru dari *Tacatic Bot 04*!`,
    }, { quoted: msg });
  }
}

if (isBotAktif && isAfk) {
  const alasan = text.split('.afk')[1]?.trim() || 'AFK';

    if ((isLink || isPollingWithLink) && !isAdmin && !isOwner) {
    const strikeDB = global.strikeCache;
    strikeDB[from] = strikeDB[from] || {};
    strikeDB[from][sender] = strikeDB[from][sender] || 0;
    strikeDB[from][sender] += 1;

    // Hapus & tambah strike
    await sock.sendMessage(from, {
      text: '⚠️ Tidak boleh menyisipkan *link* atau *polling* saat AFK!',
    }, { quoted: msg });
    await sock.sendMessage(from, { delete: msg.key });

    if (strikeDB[from][sender] >= 20) {
      await sock.groupParticipantsUpdate(from, [sender], 'remove');
      delete strikeDB[from][sender];
    }

    fs.writeJsonSync(strikeFile, strikeDB, { spaces: 2 });
    global.strikeCache = strikeDB;

    return;
  }

 await sock.sendMessage(from, {
  text: `🌙 *AFK MODE ON*\n\n📛 User: @${sender.split('@')[0]}\n📝 Alasan: ${alasan || 'Rahasia dong!'}\n💤 Status: Tidak aktif sementara\n\n📵 Jangan diganggu dulu ya, kasihan 😴`,
  mentions: [sender]
}, { quoted: msg });

  return;
}

// Cek khusus fitur dnd dulu
if (text === '.dnd on' || text === '.dnd off') {
  if (!isAdmin && !isOwner) {
    return sock.sendMessage(from, {
      text: '⚠️ Hanya *Admin Grup* yang bisa mengaktifkan/mematikan mode DND.'
    }, { quoted: msg });
  }

  const onOff = text.endsWith('on');
  fitur['dnd'] = onOff;
fs.writeJsonSync(dbFile, db, { spaces: 2 })

  return sock.sendMessage(from, {
    text: `✅ Mode *Do Not Disturb* telah *${onOff ? 'diaktifkan' : 'dimatikan'}*.`
  }, { quoted: msg });
}

 const fiturList = ['antilink1', 'antilink2', 'antipromosi', 'antitoxic', 'welcome', 'leave', 'antipolling']

for (let f of fiturList) {
  if (text === `.${f} on`) {
    if (!isAdmin && !isOwner) {
      return sock.sendMessage(from, {
        text: `⚠️ Hanya *Admin Grup* yang boleh mengaktifkan fitur *${f}*.`
      }, { quoted: msg })
    }

    if (fitur[f]) {
      return sock.sendMessage(from, {
        text: `ℹ️ Fitur *${f}* sudah aktif dari tadi kok 😁`
      }, { quoted: msg })
    }

    if (f === 'antilink1' && fitur['antilink2']) {
      fitur['antilink2'] = false
      await sock.sendMessage(from, {
        text: `⚠️ Fitur *antilink2* dimatikan agar tidak bentrok dengan *antilink1*.`
      }, { quoted: msg })
    }

    if (f === 'antilink2' && fitur['antilink1']) {
      fitur['antilink1'] = false
      await sock.sendMessage(from, {
        text: `⚠️ Fitur *antilink1* dimatikan agar tidak bentrok dengan *antilink2*.`
      }, { quoted: msg })
    }

    fitur[f] = true
    fs.writeJson(dbFile, db, { spaces: 2 })
    return sock.sendMessage(from, {
      text: `✅ Fitur *${f}* berhasil diaktifkan!`
    }, { quoted: msg })
  }

  if (text === `.${f} off`) {
    if (!isAdmin && !isOwner) {
      return sock.sendMessage(from, {
        text: `⚠️ Hanya *Admin Grup* yang boleh menonaktifkan fitur *${f}*.`
      }, { quoted: msg })
    }

    if (!fitur[f]) {
      return sock.sendMessage(from, {
        text: `ℹ️ Fitur *${f}* memang sudah nonaktif kok 😴`
      }, { quoted: msg })
    }

    fitur[f] = false
    fs.writeJson(dbFile, db, { spaces: 2 })
    return sock.sendMessage(from, {
      text: `❌ Fitur *${f}* berhasil dimatikan.`
    }, { quoted: msg })
  }
}

  if (text.startsWith('.tagall')) {
  const isi = text.split('.tagall')[1]?.trim()
  const metadata = await sock.groupMetadata(from)
  const list = metadata.participants.map(p => p.id)
  let isiPesan = isi || ''

  // Ambil isi dari reply manual
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
  if (quoted) {
    if (quoted.conversation) {
      isiPesan = quoted.conversation
    } else if (quoted.extendedTextMessage?.text) {
      isiPesan = quoted.extendedTextMessage.text
    } else if (quoted.imageMessage?.caption) {
      isiPesan = quoted.imageMessage.caption
    } else if (quoted.videoMessage?.caption) {
      isiPesan = quoted.videoMessage.caption
    } else if (quoted.buttonsMessage?.contentText) {
      isiPesan = quoted.buttonsMessage.contentText
    } else if (quoted.listMessage?.description) {
      isiPesan = quoted.listMessage.description
    } else if (quoted.templateMessage?.hydratedTemplate?.hydratedContentText) {
      isiPesan = quoted.templateMessage.hydratedTemplate.hydratedContentText
    } else {
      isiPesan = '[Pesan tidak bisa dibaca]'
    }
  }

  return sock.sendMessage(from, {
    text: isiPesan,
    mentions: list
  })
}

  if (text.startsWith('.kick')) {
  if (!isAdmin && !isOwner) {
    return sock.sendMessage(from, {
      text: '⚠️ Hanya admin grup yang bisa menendang member!'
    }, { quoted: msg })
  }

  if (!isBotAdmin) {
    return sock.sendMessage(from, {
      text: '🚫 Bot belum jadi *Admin Grup*!'
    }, { quoted: msg })
  }

  const context = msg.message?.extendedTextMessage?.contextInfo || {}
  const mentionTarget = context.mentionedJid
  const replyTarget = context.participant
  const targets = mentionTarget?.length ? mentionTarget : replyTarget ? [replyTarget] : []

  if (!targets.length) {
    return sock.sendMessage(from, {
      text: '❌ Tag atau reply dulu member yang mau ditendang.'
    }, { quoted: msg })
  }

  try {
    await sock.groupParticipantsUpdate(from, targets, 'remove')

    return sock.sendMessage(from, {
      text: '📢 *Sewa bot hanya 3k / 7 hari!*'
    }, { quoted: msg }) // ✅ Ini reply ke .kick admin
  } catch (err) {
    return sock.sendMessage(from, {
      text: '❌ Gagal kick member.'
    }, { quoted: msg })
  }
}

const OWNER_NUM = OWNER_BOT[0]; // atau broadcast ke semua OWNER_BOT kalau mau

// 👑 Promote
if (text.startsWith('.promote') && msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
  const target = msg.message.extendedTextMessage.contextInfo.mentionedJid;
  await sock.groupParticipantsUpdate(from, target, 'promote');

  // Ambil info grup & pelaku
  const groupMetadata = await sock.groupMetadata(from);
  const groupName = groupMetadata.subject;
  const pelaku = sender; // pengirim pesan

  // Kirim ke grup
  await sock.sendMessage(from, {
    text: `🎉 *Promosi Berhasil!*\nSelamat kepada:\n${target.map(jid => `• @${jid.split('@')[0]}`).join('\n')}\n\nKamu sekarang adalah *Admin Grup*! 🎖️`,
    mentions: target
  });

  // Kirim laporan ke owner
  await sock.sendMessage(OWNER_NUM, {
    text: `🔔 *LAPORAN PROMOTE*\n👤 *Pelaku:* @${pelaku.split('@')[0]}\n🎯 *Target:* ${target.map(jid => `@${jid.split('@')[0]}`).join(', ')}\n🏷️ *Grup:* ${groupName}\n🆔 ${from}`,
    mentions: [pelaku, ...target],
  });
}

// 🧹 Demote
if (text.startsWith('.demote') && msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
  const target = msg.message.extendedTextMessage.contextInfo.mentionedJid;
  await sock.groupParticipantsUpdate(from, target, 'demote');

  const groupMetadata = await sock.groupMetadata(from);
  const groupName = groupMetadata.subject;
  const pelaku = sender;

  // Kirim ke grup
  await sock.sendMessage(from, {
    text: `⚠️ *Turunkan Jabatan!*\nYang tadinya admin sekarang jadi rakyat biasa:\n${target.map(jid => `• @${jid.split('@')[0]}`).join('\n')}\n\nJangan sedih ya, tetap semangat! 😅`,
    mentions: target
  });

  // Kirim laporan ke owner
  await sock.sendMessage(OWNER_NUM, {
    text: `📢 *LAPORAN DEMOTE*\n👤 *Pelaku:* @${pelaku.split('@')[0]}\n🎯 *Target:* ${target.map(jid => `@${jid.split('@')[0]}`).join(', ')}\n🏷️ *Grup:* ${groupName}\n🆔 ${from}`,
    mentions: [pelaku, ...target],
  });
}

 // 🔓 .open
if (text.startsWith('.open')) {
  const jamInput = text.split(' ')[1]
  const jam = jamInput?.replace(':', '.')

  if (!db[from]) db[from] = {}

  if (jam && /^\d{2}\.\d{2}$/.test(jam)) {
    db[from].openTime = jam
   fs.writeJson(dbFile, db, { spaces: 2 })
    return sock.sendMessage(from, { text: `⏰ Grup akan dibuka otomatis jam *${jam.replace('.', ':')}*` })
  }

  const metadata = await sock.groupMetadata(from)
const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net'
const isBotAdmin = metadata.participants.find(p => p.id === botNumber && p.admin)

  if (!isBotAdmin) {
    return sock.sendMessage(from, { text: '❌ Bot bukan admin, tidak bisa membuka grup.' })
  }

  if (!metadata.announce) {
    return sock.sendMessage(from, { text: '✅ Grup sudah terbuka.' })
  }

  await sock.groupSettingUpdate(from, 'not_announcement')
  return sock.sendMessage(from, { text: '✅ Grup dibuka! Ayo ngobrol!' })
}

// 🔒 .close
if (text.startsWith('.close')) {
  const jamInput = text.split(' ')[1]
  const jam = jamInput?.replace(':', '.')

  if (!db[from]) db[from] = {}

  if (jam && /^\d{2}\.\d{2}$/.test(jam)) {
    db[from].closeTime = jam
    fs.writeJsonSync(dbFile, db, { spaces: 2 })
    return sock.sendMessage(from, { text: `⏰ Grup akan ditutup otomatis jam *${jam.replace('.', ':')}*` })
  }

  const metadata = await sock.groupMetadata(from)
const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net'
const isBotAdmin = metadata.participants.find(p => p.id === botNumber && p.admin)


  if (!isBotAdmin) {
    return sock.sendMessage(from, { text: '❌ Bot bukan admin, tidak bisa menutup grup.' })
  }

  if (metadata.announce) {
    return sock.sendMessage(from, { text: '🔒 Grup sudah tertutup.' })
  }

  await sock.groupSettingUpdate(from, 'announcement')
  return sock.sendMessage(from, { text: '🔒 Grup ditutup! Waktunya istirahat!' })
}

 if (text === '.cekaktif') {
  const fiturList = ['antilink1', 'antilink2', 'antipromosi', 'antitoxic', 'welcome', 'leave', 'antipolling', 'dnd']
  let aktif = ''
  let mati = ''

  for (let f of fiturList) {
    if (fitur[f]) {
      aktif += `✅ *${f}*\n`
    } else {
      mati += `❌ *${f}*\n`
    }
  }

  const masaAktif = fitur.permanen ? 'PERMANEN' : (fitur.expired || 'Belum aktif')

  return sock.sendMessage(from, {
    text: `📊 *CEK STATUS FITUR GRUP*\n\n📛 Grup: *${fitur.nama || 'Tidak diketahui'}*\n📅 Aktif sampai: *${masaAktif}*\n\n🟢 *Fitur Aktif:*\n${aktif || '-'}\n\n🔴 *Fitur Nonaktif:*\n${mati || '-'}`,
  }, { quoted: msg });
}

if (text.startsWith('.setdesc')) {
  if (!isAdmin && !isOwner) {
    return sock.sendMessage(from, {
      text: '⚠️ Hanya admin yang bisa mengatur deskripsi grup!'
    }, { quoted: msg });
  }

  const desc = text.split('.setdesc')[1]?.trim();
  if (!desc) {
    return sock.sendMessage(from, {
      text: '❌ Format salah.\nContoh: *.setdesc Ini grup keren banget!*'
    }, { quoted: msg });
  }

  try {
    await sock.groupUpdateDescription(from, desc);
    return sock.sendMessage(from, {
      text: '✅ Deskripsi grup berhasil diubah!'
    }, { quoted: msg });
  } catch (err) {
    return sock.sendMessage(from, {
      text: '❌ Gagal mengubah deskripsi grup.'
    }, { quoted: msg });
  }
}

if (text === '.hapus') {
  const isGroup = from.endsWith('@g.us')
  const metadata = isGroup ? await sock.groupMetadata(from) : {}
  const participants = isGroup ? metadata.participants : []
  const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net'
  const isBotAdmin = participants.find(p => p.id === botNumber)?.admin
  const isAdmin = participants.find(p => p.id === sender)?.admin

  if (!isGroup) return

  if (!isAdmin && !isOwner) {
    return sock.sendMessage(from, {
      text: '❌ Hanya *Admin* yang bisa menghapus pesan.',
    }, { quoted: msg })
  }

  const contextInfo = msg.message?.extendedTextMessage?.contextInfo

  if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
    return sock.sendMessage(from, {
      text: '⚠️ Kamu harus *reply* pesan yang ingin dihapus.',
    }, { quoted: msg })
  }

  try {
    await sock.sendMessage(from, {
      delete: {
        remoteJid: from,
        fromMe: false,
        id: contextInfo.stanzaId,
        participant: contextInfo.participant
      }
    })

    await sock.sendMessage(from, {
      text: '✅ Pesan berhasil dihapus.',
    }, { quoted: msg })

  } catch (err) {
    console.error('❌ Gagal hapus pesan:', err)
    return sock.sendMessage(from, {
      text: '⚠️ Gagal menghapus pesan. Mungkin bot bukan admin atau pesan sudah kedaluwarsa.',
    }, { quoted: msg })
  }
}

// ❗ ABAIKAN command tak dikenal, TAPI tetap jalankan filter antilink/antitoxic/promosi
if (isCommand && !isCmdValid) {
  console.log(`⚠️ Command tidak dikenal: ${text}`);

  // 🔥 Hapus command tidak dikenal jika mengandung hal mencurigakan
  if (isBotAktif && !isAdmin && !isOwner) {
    if (fitur.antilink1 && isLink) {
      await sock.sendMessage(from, { delete: msg.key });
      console.log(`🚫 [CMD] Link dihapus walau command tidak dikenal: ${text}`);
      return;
    }
    if (fitur.antipromosi && isPromo) {
      await sock.sendMessage(from, { delete: msg.key });
      console.log(`🚫 [CMD] Promosi dihapus walau command tidak dikenal: ${text}`);
      return;
    }
    if (fitur.antitoxic && isToxic) {
      await sock.sendMessage(from, { delete: msg.key });
      console.log(`🚫 [CMD] Toxic dihapus walau command tidak dikenal: ${text}`);
      return;
    }
  }
}

}
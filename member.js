const fs = require('fs-extra');
const { exec } = require('child_process');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fetch = require('node-fetch');
const Jimp = require('jimp');
const axios = require('axios'); // ← Tambah ini
const removebgApiKey = 'Bbu9ZjZcsJAnpif94ma6sqZN'; // ← API Key 
const ffmpeg = require('fluent-ffmpeg');

const limitFile = './limit.json'
if (!fs.existsSync(limitFile)) fs.writeJsonSync(limitFile, {})

const cekLimit = (from, sender, fitur) => {
  const db = fs.readJsonSync(limitFile)
  const today = new Date().toISOString().split('T')[0]

  db[from] = db[from] || {}
  db[from][sender] = db[from][sender] || {}
  const user = db[from][sender][fitur] || { count: 0, date: today }

  // Reset otomatis jika beda hari
  if (user.date !== today) {
    user.count = 0
    user.date = today
  }

  // Jika sudah 2x, tolak
  if (user.count >= 2) return false

  // Tambah penggunaan
  user.count += 1
  db[from][sender][fitur] = user
  fs.writeJsonSync(limitFile, db, { spaces: 2 })
  return true
}

module.exports = async (sock, msg, text, from, sender, isAdmin, isOwner) => {
  const db = fs.readJsonSync('./grup.json');
  const fitur = db[from] || {};

  const now = new Date();
  const isAktif = fitur.permanen || (fitur.expired && new Date(fitur.expired) > now);

  // Allow .menu even if bot is not active
  if (!isAktif && !text.startsWith('.menu')) {
    return sock.sendMessage(from, {
      text: `⚠️ Bot belum aktif di grup ini.\n\nMinta *Owner Grup* aktifkan dulu dengan:\n• .aktifbot3k (1 minggu)\n• .aktifbot5k (1 bulan)\n• .aktifbot7k (2 bulan)\n• .aktifbotper (permanen)`
    }, { quoted: msg });
  }

 if (text === '.menu') {
  return sock.sendMessage(from, {
    text: `🎀 *MENU MEMBER – TACATIC BOT 04* 🎀

🛠️ *Fitur Tersedia untuk Member:*
• 📋 _.menu_ – Lihat daftar fitur
• 🖼️ _.stiker_ – Buat stiker dari gambar
• 📷 _.hd_ – Jadikan gambar lebih tajam
• 📷 _.hdv2_ – Versi HD dengan warna vivid & kontras
• 🧼 _.removebg_ – Hapus background gambar
• 💬 _.addbrat teks_ – Buat stiker teks lucu
• 💬 _.bratv2 teks_ – Buat stiker teks elegan

✨ Nikmati fitur seru dari *Tacatic Bot 04*!`,
  }, { quoted: msg });
}

if (text.startsWith('.tiktok ')) {
  const url = text.split(' ')[1];

  if (!url || !url.includes('tiktok.com')) {
    return sock.sendMessage(from, {
      text: '❌ Link TikTok tidak valid. Contoh: .tiktok https://www.tiktok.com/@user/video/xxxx'
    }, { quoted: msg });
  }

  try {
    const apiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(url)}`;
    const res = await axios.get(apiUrl);

    const data = res.data?.data;
    if (!data || !data.play) {
      return sock.sendMessage(from, {
        text: '⚠️ Gagal mengambil video. Link mungkin tidak valid atau private.'
      }, { quoted: msg });
    }

    const videoUrl = data.play;
    const { data: buffer } = await axios.get(videoUrl, { responseType: 'arraybuffer' });

    await sock.sendMessage(from, {
      video: buffer,
      caption: `✅ Berhasil download video TikTok.\n👤 @${data.author?.unique_id || '-'}\n🎬 ${data.title || '-'}`
    }, { quoted: msg });

  } catch (err) {
    console.error('❌ TikTok Error:', err.message);
    await sock.sendMessage(from, {
      text: '⚠️ Gagal download video TikTok. Coba ulangi atau gunakan link berbeda.'
    }, { quoted: msg });
  }
}

// // 📷 .hdv2 – tajam dan warna keluar
// if (text === '.hdv2') {
//   const context = msg.message?.extendedTextMessage?.contextInfo;
//   const quotedMsg = context?.quotedMessage;

//   if (!quotedMsg || !quotedMsg.imageMessage) {
//     return sock.sendMessage(from, {
//       text: '❌ Reply gambar lalu ketik *.hdv2* untuk membuat versi lebih tajam dan jernih.'
//     }, { quoted: msg });
//   }

//   try {
//     const buffer = await downloadMediaMessage(
//       { message: { imageMessage: quotedMsg.imageMessage } },
//       'buffer',
//       {},
//       { logger: console, reuploadRequest: sock.updateMediaMessage }
//     );

//     const tempPath = `./hdv2-${Date.now()}.jpg`;
//     fs.writeFileSync(tempPath, buffer);

//     const image = await Jimp.read(tempPath);
//     image
//       .resize(600, Jimp.AUTO)         // kecil tapi tetap jernih
//       .contrast(0.2)                  // cukup tajam
//       .brightness(0.2)                // cukup terang
//       .normalize()                    // seimbangkan warna
//       .quality(93);                   // kualitas bagus, ukuran kecil

//     await image.writeAsync(tempPath);

//     const hasil = fs.readFileSync(tempPath);
//     await sock.sendMessage(from, {
//       image: hasil,
//       caption: '✅ HDv2 selesai: jernih, tidak buram, warna keluar.'
//     }, { quoted: msg });

//     fs.unlinkSync(tempPath);
//   } catch (err) {
//     console.error('❌ HDv2 Error:', err);
//     await sock.sendMessage(from, {
//       text: '⚠️ Gagal memproses gambar. Coba ulangi lagi.'
//     }, { quoted: msg });
//   }
// }

if (text === '.hd') {
  const context = msg.message?.extendedTextMessage?.contextInfo;
  const quotedMsg = context?.quotedMessage;

  if (!quotedMsg || (!quotedMsg.imageMessage && !quotedMsg.videoMessage)) {
    return sock.sendMessage(from, {
      text: '❌ Reply gambar *atau video* lalu ketik *.hd* untuk membuat versi HD-nya.'
    }, { quoted: msg });
  }

  try {
    const type = quotedMsg.imageMessage ? 'image' : 'video';
    const mediaMessage = quotedMsg.imageMessage || quotedMsg.videoMessage;

    const buffer = await downloadMediaMessage(
      { message: { [`${type}Message`]: mediaMessage } },
      'buffer',
      {},
      { logger: console, reuploadRequest: sock.updateMediaMessage }
    );

    const tempName = `./hd-${Date.now()}`;
    const inputFile = `${tempName}.${type === 'image' ? 'jpg' : 'mp4'}`;
    const outputFile = `${tempName}-hd.${type === 'image' ? 'jpg' : 'mp4'}`;

    fs.writeFileSync(inputFile, buffer);

    if (type === 'image') {
      const Jimp = require('jimp');
      const image = await Jimp.read(inputFile);
      image
        .contrast(0.2)
        .brightness(0.5)
        .normalize()
        .quality(90);
      await image.writeAsync(outputFile);

      const hasil = fs.readFileSync(outputFile);
      await sock.sendMessage(from, {
        image: hasil,
        caption: '✅ Gambar HD berhasil dibuat!'
      }, { quoted: msg });

    } else {
      const ffmpeg = require('fluent-ffmpeg');
      await new Promise((resolve, reject) => {
       ffmpeg(inputFile)
  .videoCodec('libx264')
  .size('?x720') // Upscale ke 720p
  .outputOptions([
    '-preset ultrafast', // lebih cepat proses
    '-crf 28',            // lebih tinggi = lebih kecil size (22–28)
    '-b:v 500k',          // bitrate video
    '-movflags +faststart' // percepat load awal video
  ])
  .on('end', resolve)
  .on('error', reject)
  .save(outputFile);
      });

      const hasil = fs.readFileSync(outputFile);
      await sock.sendMessage(from, {
        video: hasil,
        caption: '✅ Video HD berhasil dibuat!'
      }, { quoted: msg });
    }

    // Hapus file sementara
    fs.unlinkSync(inputFile);
    fs.unlinkSync(outputFile);

  } catch (err) {
    console.error('❌ HD Error:', err);
    await sock.sendMessage(from, {
      text: '⚠️ Gagal memproses media. Coba reply ulang.'
    }, { quoted: msg });
  }
}

// 🧼 .removebg
if (text === '.removebg') {
  //  // 💥 Batasi 2x per hari untuk member biasa
  // if (!isAdmin && !isOwner) {
  //   if (!cekLimit(from, sender, 'removebg')) {
  //     return sock.sendMessage(from, {
  //       text: '⚠️ Batas penggunaan *.removebg* sudah habis hari ini (maks 2x).\nCoba lagi besok ya!'
  //     }, { quoted: msg });
  //   }
  // }

  try {
    const context = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = context?.quotedMessage?.imageMessage;

    if (!quoted) {
      return sock.sendMessage(from, {
        text: '❌ Reply gambar lalu ketik *.removebg* untuk menghapus background.'
      }, { quoted: msg });
    }

    const buffer = await downloadMediaMessage(
      { message: { imageMessage: quoted } },
      'buffer',
      {},
      { logger: console, reuploadRequest: sock.updateMediaMessage }
    );

    const tempInput = `./temp-in-${Date.now()}.jpg`;
    const tempOutput = `./temp-out-${Date.now()}.png`;
    fs.writeFileSync(tempInput, buffer);

    const response = await axios({
      method: 'post',
      url: 'https://api.remove.bg/v1.0/removebg',
      data: {
        image_file_b64: buffer.toString('base64'),
        size: 'auto'
      },
      headers: {
        'X-Api-Key': removebgApiKey
      },
      responseType: 'arraybuffer'
    });

    if (response.data) {
      fs.writeFileSync(tempOutput, response.data);

      await sock.sendMessage(from, {
        image: fs.readFileSync(tempOutput),
        caption: '✅ Remove BG Success'
      }, { quoted: msg });

      fs.unlinkSync(tempInput);
      fs.unlinkSync(tempOutput);
    } else {
      throw new Error('No data dari remove.bg');
    }
  } catch (err) {
    console.error('❌ RemoveBG Error:', err.message);
    return sock.sendMessage(from, {
      text: '⚠️ Gagal menghapus background. Coba ulangi atau cek API Key.'
    }, { quoted: msg });
  }
}

  // 🖼️ .stiker
  if (text === '.stiker') {
  //   // 💥 Batas 2x untuk member biasa
  // if (!isAdmin && !isOwner) {
  //   if (!cekLimit(from, sender, 'stiker')) {
  //     return sock.sendMessage(from, {
  //       text: '⚠️ Batas penggunaan *.stiker* sudah habis hari ini (maks 2x).\nCoba lagi besok ya!'
  //     }, { quoted: msg });
  //   }
  // }

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const mediaMessage = quoted?.imageMessage || msg?.message?.imageMessage;
    if (!mediaMessage) {
      return sock.sendMessage(from, { text: '❌ Kirim atau reply gambar dengan .stiker' }, { quoted: msg });
    }

    try {
      const buffer = await downloadMediaMessage(
        { message: quoted ? { imageMessage: quoted.imageMessage } : msg.message },
        'buffer',
        {},
        { logger: console, reuploadRequest: sock.updateMediaMessage }
      );

      const filename = `./${Date.now()}`;
      const inputPath = `${filename}.jpg`;
      const outputPath = `${filename}.webp`;

      fs.writeFileSync(inputPath, buffer);

      await new Promise((resolve, reject) => {
        const cmd = `convert "${inputPath}" -resize 512x512^ -gravity center -extent 512x512 -quality 100 "${outputPath}"`;
        exec(cmd, (err) => err ? reject(err) : resolve());
      });

      const stickerBuffer = fs.readFileSync(outputPath);
      await sock.sendMessage(from, { sticker: stickerBuffer, mimetype: 'image/webp' }, { quoted: msg });

      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    } catch (err) {
      console.error(err);
      await sock.sendMessage(from, { text: '⚠️ Gagal membuat stiker!' }, { quoted: msg });
    }
  }

  // 💬 .addbrat
  if (text.startsWith('.addbrat ')) {
  //   // 💥 Batas 2x untuk member biasa
  // if (!isAdmin && !isOwner) {
  //   if (!cekLimit(from, sender, 'addbrat')) {
  //     return sock.sendMessage(from, {
  //       text: '⚠️ Batas penggunaan *.addbrat* sudah habis hari ini (maks 2x).\nCoba lagi besok ya!'
  //     }, { quoted: msg });
  //   }
  // }

    const teks = text.split('.addbrat ')[1].trim();
    if (!teks) {
      return sock.sendMessage(from, {
        text: '❌ Masukkan teks setelah .addbrat\nContoh: .addbrat semangat terus ya!'
      }, { quoted: msg });
    }

    try {
      const filename = Date.now();
      const pngPath = `./${filename}.png`;
      const webpPath = `./${filename}.webp`;

      const font = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
      const image = new Jimp(512, 512, 0xffffffff);
      const lines = teks.split(' ').reduce((a, b, i) => {
        if (i % 2 === 0) a.push(b);
        else a[a.length - 1] += ' ' + b;
        return a;
      }, []).join('\n');

      image.print(font, 0, 0, {
        text: lines,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
      }, 512, 512);

      image.quality(100);
      await image.writeAsync(pngPath);

      await new Promise((resolve, reject) => {
        const cmd = `convert "${pngPath}" -resize 512x512^ -gravity center -extent 512x512 -quality 100 "${webpPath}"`;
        exec(cmd, (err) => err ? reject(err) : resolve());
      });

      const buffer = fs.readFileSync(webpPath);
      await sock.sendMessage(from, { sticker: buffer, mimetype: 'image/webp' }, { quoted: msg });

      fs.unlinkSync(pngPath);
      fs.unlinkSync(webpPath);
    } catch (err) {
      console.error(err);
      await sock.sendMessage(from, { text: '⚠️ Gagal membuat stiker teks!' }, { quoted: msg });
    }
  }

    //brat2
  if (text.startsWith('.bratv2 ')) {
  const teks = text.split('.bratv2 ')[1].trim();
  if (!teks) {
    return sock.sendMessage(from, {
      text: '❌ Masukkan teks setelah .bratv2\nContoh: .bratv2 happy birthday sayang'
    }, { quoted: msg });
  }

  try {
    const filename = Date.now();
    const pngPath = `./${filename}.png`;
    const webpPath = `./${filename}.webp`;

    const font = await Jimp.loadFont('./brat.fnt');
    const image = new Jimp(512, 512, 0xffffffff);
    image.print(font, 0, 100, {
  text: teks,
  alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
  alignmentY: Jimp.VERTICAL_ALIGN_TOP
}, 512, 300); // Hanya pakai tengah atas

    image.quality(100);
    await image.writeAsync(pngPath);

    await new Promise((resolve, reject) => {
      exec(`convert "${pngPath}" -resize 512x512^ -gravity center -extent 512x512 "${webpPath}"`, err => err ? reject(err) : resolve());
    });

    const buffer = fs.readFileSync(webpPath);
    await sock.sendMessage(from, { sticker: buffer, mimetype: 'image/webp' }, { quoted: msg });

    fs.unlinkSync(pngPath);
    fs.unlinkSync(webpPath);
  } catch (err) {
    console.error(err);
    await sock.sendMessage(from, { text: '⚠️ Gagal membuat stiker teks brat!' }, { quoted: msg });
  }
}

};

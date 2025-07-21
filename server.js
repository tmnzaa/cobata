const express = require('express');
const fs = require('fs-extra');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = 3000;

const dbFile = './grup.json';
if (!fs.existsSync(dbFile)) fs.writeJsonSync(dbFile, {});

app.set('view engine', 'ejs');
app.set('views', __dirname); // ✅ biar ambil file ejs langsung dari folder utama
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  const db = fs.readJsonSync(dbFile);
  const grupList = Object.entries(db).map(([id, data]) => ({
    id,
    nama: data.nama || 'Tidak diketahui',
    expired: data.expired || '-',
    status: (data.expired && new Date(data.expired) > new Date()) ? 'Aktif ✅' : 'Nonaktif ❌'
  }));

  res.render('panel', { grupList });
});

app.get('/grup/:id', (req, res) => {
  const db = fs.readJsonSync(dbFile);
  const data = db[req.params.id];
  if (!data) return res.status(404).send('Grup tidak ditemukan.');

  const fiturList = ['antilink1', 'antilink2', 'antipromosi', 'antitoxic', 'welcome'];
  const fiturAktif = fiturList.filter(f => data[f]);
  const fiturNonaktif = fiturList.filter(f => !data[f]);

  res.render('detail', {
    id: req.params.id,
    nama: data.nama,
    expired: data.expired || '-',
    status: (data.expired && new Date(data.expired) > new Date()) ? 'Aktif ✅' : 'Nonaktif ❌',
    fiturAktif,
    fiturNonaktif
  });
});

// ✅ Emit ke client jika ada perubahan database
const emitUpdate = () => {
  const db = fs.readJsonSync(dbFile);
  io.emit('update', db);
};

app.post('/grup/:id/hapus', (req, res) => {
  const db = fs.readJsonSync(dbFile);
  const id = req.params.id;

  if (!db[id]) return res.redirect('/');
  delete db[id];
  fs.writeJsonSync(dbFile, db, { spaces: 2 });
  emitUpdate();
  res.redirect('/');
});

app.delete('/grup/hapus-semua', (req, res) => {
  try {
    fs.writeJsonSync(dbFile, {}, { spaces: 2 });
    emitUpdate();
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Gagal hapus semua grup:', err.message);
    res.status(500).send('Gagal menghapus semua grup.');
  }
});

// ✅ Watch perubahan file
fs.watchFile(dbFile, emitUpdate);

http.listen(PORT, () => {
  console.log(`✅ Panel aktif di http://localhost:${PORT}`);
});

const fs = require('fs');

module.exports = (packname, author) => {
  const exifAttr = {
    "sticker-pack-id": "com.tacatic.tamstoree",
    "sticker-pack-name": packname,
    "sticker-pack-publisher": author,
    emojis: ["🌟"]
  };

  const json = Buffer.from(JSON.stringify(exifAttr), 'utf-8');
  const exif = Buffer.concat([
    Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00]),
    Buffer.from([0x01, 0x00]),
    Buffer.from([0x1C, 0x01]),
    Buffer.from([0x07, 0x00]),
    Buffer.from([json.length, 0x00, 0x00, 0x00]),
    Buffer.from([0x1A, 0x00, 0x00, 0x00]),
    json
  ]);

  fs.writeFileSync('exif.exif', exif);
};

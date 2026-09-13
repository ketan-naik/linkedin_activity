// Script to generate valid PNG icon files for the extension using pure Node.js (zlib + fs)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(width, height) {
  // RGB pixels (3 bytes per pixel) or RGBA (4 bytes per pixel)
  const bytesPerPixel = 4; // RGBA
  const rowBytes = width * bytesPerPixel;
  const rawData = Buffer.alloc((rowBytes + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowBytes + 1);
    rawData[rowOffset] = 0; // Filter type 0 (None)
    
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + (x * bytesPerPixel);
      
      // Calculate normalized coords
      const nx = x / width;
      const ny = y / height;
      
      // Rounded corner mask
      const rx = (x < width/2 ? x : width - 1 - x);
      const ry = (y < height/2 ? y : height - 1 - y);
      const radius = Math.min(width, height) * 0.22;
      let alpha = 255;
      if (rx < radius && ry < radius) {
        const dist = Math.sqrt((radius - rx)**2 + (radius - ry)**2);
        if (dist > radius) {
          alpha = 0;
        }
      }

      if (alpha === 0) {
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }

      // Gradient background: LinkedIn Blue #0A66C2 to Cyan #00D2FF
      const r = Math.round(10 + nx * 0);
      const g = Math.round(102 + nx * 80 + ny * 20);
      const b = Math.round(194 + (1 - ny) * 55);

      // Simple central Data/Lightning emblem
      const cx = width / 2;
      const cy = height / 2;
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);

      // Central diamond/node motif
      let isGraphic = false;
      if (width >= 32) {
        if ((dx + dy) < width * 0.28 && (dx + dy) > width * 0.18) isGraphic = true;
        if (Math.abs(x - cx) < width * 0.08 && Math.abs(y - cy) < width * 0.08) isGraphic = true;
        // Horizontal connection lines
        if (Math.abs(y - cy) < width * 0.04 && Math.abs(x - cx) < width * 0.35) isGraphic = true;
      } else {
        if ((dx + dy) < width * 0.35) isGraphic = true;
      }

      if (isGraphic) {
        rawData[pixelOffset] = 255;     // White/Cyan
        rawData[pixelOffset + 1] = 255;
        rawData[pixelOffset + 2] = 255;
        rawData[pixelOffset + 3] = 255;
      } else {
        rawData[pixelOffset] = Math.min(255, r);
        rawData[pixelOffset + 1] = Math.min(255, g);
        rawData[pixelOffset + 2] = Math.min(255, b);
        rawData[pixelOffset + 3] = alpha;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcData = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Simple CRC32 implementation
function crc32(buf) {
  let c;
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const png = createPNG(size, size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
  console.log(`Generated icon${size}.png (${png.length} bytes)`);
});

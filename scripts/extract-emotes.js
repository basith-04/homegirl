'use strict';
// Deterministically crops a regular 3 × 2 source sheet without resampling it.
// It needs only macOS's built-in `sips`; PNG alpha and pixel edges are retained.
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..'); const input = path.join(root, 'image.jpg');
if (!fs.existsSync(input)) throw new Error('Missing image.jpg at repository root.');
const info = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', input], { encoding: 'utf8' }); const width = Number(info.match(/pixelWidth:\s*(\d+)/)?.[1]); const height = Number(info.match(/pixelHeight:\s*(\d+)/)?.[1]);
if (!width || !height) throw new Error('Could not inspect image.png dimensions.');
const panelW = Math.floor(width / 4); const panelH = Math.floor(height / 4); const selections = { idle: [0, 0], suspicious: [0, 1], angry: [0, 2], happy: [0, 3], confused: [1, 2], evil: [3, 1] }; const outputs = [];
for (const [name, [row, col]] of Object.entries(selections)) { const out = path.join(root, 'assets', 'emotes', name, 'character.png'); fs.mkdirSync(path.dirname(out), { recursive: true }); execFileSync('magick', [input, '-crop', `${panelW}x${panelH}+${col * panelW}+${row * panelH}`, '+repage', '-alpha', 'off', '-fuzz', '2%', '-transparent', 'black', out]); outputs.push(out); }
const rowOne = path.join(root, 'assets', 'emotes', '.preview-row-one.png'); const rowTwo = path.join(root, 'assets', 'emotes', '.preview-row-two.png');
execFileSync('magick', [...outputs.slice(0, 3), '+append', rowOne]); execFileSync('magick', [...outputs.slice(3), '+append', rowTwo]); execFileSync('magick', [rowOne, rowTwo, '-append', path.join(root, 'assets', 'emotes', 'preview.png')]); fs.unlinkSync(rowOne); fs.unlinkSync(rowTwo);
console.log(`Extracted ${outputs.length} emotes from ${width}×${height}; preview: assets/emotes/preview.png`);

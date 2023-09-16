import { convertText } from './source-map-manager';

const [filename] = process.argv.slice(2);

if (!filename) {
  console.log('pass a filename argument');
  process.exit();
}

const foo = Bun.file(filename);

(async () => {
  const text = await foo.text();
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; ++i) {
    const {text} = await convertText(lines[i]);
    lines[i] = text;
  }
  await Bun.write(filename, lines.join('\n'));
})();



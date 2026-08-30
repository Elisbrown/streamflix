import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
if (!fs.existsSync(dist)) throw new Error('dist/ does not exist. Run npm run build first.');

const appinfo = {
  id: 'com.streamflix.webos',
  version: '1.0.2',
  type: 'web',
  main: 'index.html',
  title: 'Streamflix',
  appDescription: 'Streamflix for LG webOS TV',
  icon: 'icon.png',
  largeIcon: 'largeIcon.png',
  vendor: 'Maitre Soco',
  visible: true,
  removable: true,
  inspectable: true
};

fs.writeFileSync(path.join(dist, 'appinfo.json'), JSON.stringify(appinfo, null, 2));
for (const file of ['icon.png', 'largeIcon.png', 'splashBackground.png']) {
  const source = path.join(root, file);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(dist, file));
}
console.log('webOS staging complete:', dist);

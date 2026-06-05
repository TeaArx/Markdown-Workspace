const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packageJson = require(path.join(root, 'package.json'));
const publishConfig = Array.isArray(packageJson.build?.publish)
  ? packageJson.build.publish.find((entry) => entry.provider === 'github')
  : null;

if (!publishConfig) {
  throw new Error('No GitHub publish config found in package.json build.publish');
}

const resourcesDir = path.join(root, 'out', 'Markdown Workspace-win32-x64', 'resources');
const updateConfig = [
  'provider: github',
  `owner: ${publishConfig.owner}`,
  `repo: ${publishConfig.repo}`,
  'updaterCacheDirName: markdown-workspace-updater',
  '',
].join('\n');

fs.mkdirSync(resourcesDir, { recursive: true });
fs.writeFileSync(path.join(resourcesDir, 'app-update.yml'), updateConfig, 'utf8');

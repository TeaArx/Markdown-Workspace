import path from "node:path";

import appIconIco from "../../assets/icon.ico";
import appIconPng from "../../assets/icon.png";

function resolveBundledAsset(assetPath: string): string {
  return path.isAbsolute(assetPath) ? assetPath : path.join(__dirname, assetPath);
}

export const windowIconPath = resolveBundledAsset(
  process.platform === "win32" ? appIconIco : appIconPng,
);

export const trayIconPath = resolveBundledAsset(appIconPng);

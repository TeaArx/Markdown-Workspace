import path from "node:path";

function resolveBundledAsset(fileName: string): string {
  return path.join(__dirname, "../../assets", fileName);
}

export const windowIconPath = resolveBundledAsset(
  process.platform === "win32" ? "icon.ico" : "icon.png",
);

export const trayIconPath = resolveBundledAsset("icon.png");

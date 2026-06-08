import path from "node:path";
import { pathToFileURL } from "node:url";

const rendererDevUrl = process.env.ELECTRON_RENDERER_URL;

function appendRoute(baseUrl: string, route = ""): string {
  return route ? `${baseUrl}${route}` : baseUrl;
}

export function getRendererUrl(route = ""): string {
  if (rendererDevUrl) {
    return appendRoute(rendererDevUrl, route);
  }

  const rendererIndex = pathToFileURL(path.join(__dirname, "../renderer/index.html")).toString();
  return appendRoute(rendererIndex, route);
}

export function getPreloadPath(): string {
  return path.join(__dirname, "../preload/preload.js");
}

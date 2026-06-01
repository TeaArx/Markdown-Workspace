import appIcon from '../assets/icon.png';
import './renderer/main';

const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]') ?? document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/png';
favicon.href = appIcon;

if (!favicon.parentElement) {
  document.head.appendChild(favicon);
}

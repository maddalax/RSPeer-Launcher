export const LauncherVersion = '1.13';
export const isDev = () => window.rspeer.env && window.rspeer.env.isDev;
export const isStaging = () => window.rspeer.env && window.rspeer.env.isStaging;
export const isProd = () => !window.rspeer.env || window.rspeer.env.isProd;
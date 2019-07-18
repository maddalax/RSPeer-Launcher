const isDev = process.env.NODE_ENV === 'development';
const isStaging = process.env.NODE_ENV === 'staging';
const isProd = !isDev && !isStaging;
const openDevTools = process.env.tools = 'true' && !isProd;

module.exports = {
    isDev,
    isStaging,
    isProd,
    openDevTools
};
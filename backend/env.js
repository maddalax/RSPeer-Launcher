const isDev = process.env.NODE_ENV === 'development';
const isStaging = process.env.NODE_ENV === 'staging';
const isProd = !isDev && !isStaging;

module.exports = {
    isDev,
    isStaging,
    isProd
};
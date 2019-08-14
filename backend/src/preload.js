window.ipcRenderer = require('electron').ipcRenderer;
window.remote = require('electron').remote;
const {isProd, isDev, isStaging} = require('./env');
window.rspeer = window.rspeer || {env : {isProd, isStaging, isDev}};
window.rspeer.apiUrl = "http://localhost/api/";
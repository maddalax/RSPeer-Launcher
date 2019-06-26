// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron');
const path = require('path');
const Sentry = require('@sentry/electron');
const { dialog } = require('electron');
Sentry.init({dsn: 'https://6f43d99cb16342e6b38f4b0f634ae23c@sentry.io/1490824'});

process.on('uncaughtException', function (error) {
  Sentry.captureException(error);
  dialog.showErrorBox('An uncaught error has occured. Please restart the launcher.', error.toString());
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let loadingWindow;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    title : 'RSPeer Launcher',
    vibrancy : 'dark',
    darkTheme : true,
    width: 800,
    height: 768,
    show : false,
    webPreferences: {
      webSecurity : false,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  mainWindow.loadURL('https://rspeer-launcher.netlify.com');

  mainWindow.webContents.once('dom-ready', () => {
    setTimeout(() => {
      mainWindow.show();
      loadingWindow.hide();
      loadingWindow.close();
      loadingWindow = null;
      mainWindow.webContents.openDevTools({mode : "detach", activate : true});
    }, 800);
  });
  
  mainWindow.on('closed', function () {
    mainWindow = null;
    loadingWindow = null;
  })
}

function createLoadingWindow() {
  loadingWindow = new BrowserWindow({show: false, frame: false, width : 620, height : 96, darkTheme : true});
  loadingWindow.once('show', () => {
    createWindow();
  });
  loadingWindow.loadFile('./public/index.html');
  loadingWindow.show();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createLoadingWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
});

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createLoadingWindow()
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

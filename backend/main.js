// Modules to control application life and create native browser window
const {app, BrowserWindow, Tray, Menu} = require('electron');
const path = require('path');
const Sentry = require('@sentry/electron');
const notifier = require('node-notifier');

const { dialog, shell } = require('electron');
Sentry.init({dsn: 'https://6f43d99cb16342e6b38f4b0f634ae23c@sentry.io/1490824'});

process.on('uncaughtException', function (error) {
  Sentry.captureException(error);
  dialog.showErrorBox('An uncaught error has occured. Please restart the launcher.', error.toString());
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let loadingWindow;
let isQuitting;
let isForceQuit;
let isAlertActive;
let tray;
const nc = new notifier.NotificationCenter();

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

  mainWindow.on('minimize',function(event) {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('close', function (event) {
    if(!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      showNotQuitAlert();
      return false;
    }
  });

  //mainWindow.loadURL('http://localhost:3000');
  mainWindow.loadURL('https://rspeer-launcher.netlify.com');

  mainWindow.webContents.once('dom-ready', () => {
    setTimeout(() => {
      mainWindow.show();
      loadingWindow.hide();
      loadingWindow.close();
      loadingWindow = null;
      //mainWindow.webContents.openDevTools({mode : "detach", activate : true});
    }, 800);
  });
  
  mainWindow.on('closed', function () {
    mainWindow = null;
    loadingWindow = null;
  })
}

function createLoadingWindow() {
  
  tray = new Tray(path.join(__dirname, 'public', 'tray.png'));
  tray.setToolTip('RSPeer Launcher');
  tray.displayBalloon({
    content : 'sup',
    title : 'ayy'
  });
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Show', click: function () {
        mainWindow.show();
      }
    },
    {
      label: 'Quit', click: function () {
        isForceQuit = true;
        app.quit();
      }
    }
  ]));
  
  
  loadingWindow = new BrowserWindow({show: false, frame: false, width : 620, height : 96, darkTheme : true});
  loadingWindow.once('show', () => {
    createWindow();
  });
  loadingWindow.loadFile('./public/index.html');
  let showing = false;
  loadingWindow.webContents.once('dom-ready', () => {
    showing = true;
    loadingWindow.show();
  });
  setTimeout(() => {
    if(!showing) {
      loadingWindow.show();
    }
  }, 1000)
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

app.on('before-quit', function () {
  if(!isForceQuit) {
    showNotQuitAlert();
    return;
  }
  isQuitting = true;
});

function showNotQuitAlert() {
  if(isAlertActive) {
    return;
  }
  isAlertActive = true;
  nc.notify({
    title: 'RSPeer Launcher is still running.',
    message: 'RSPeer Launcher needs to stay running to be able to launch clients to this computer remotely. To quit fully, click the task-bar icon and select quit.',
    icon: path.join(__dirname, 'public', 'tray@2x.png'),
    actions : ['More Info'],
    appID : 'org.rspeer.Launcher',
    wait : true,
    timeout : 14400,
    closeLabel : 'Quit Fully'
  }, function (err, res, action) {
    isAlertActive = false;
    if(!action) {
      return;
    }

    if(action.activationType === 'actionClicked') {
      if(action.activationValue === 'More Info') {
        shell.openExternal('https://rspeer.org/resources/rspeer-launcher-faq');
      }
    }
    if(action.activationType === 'closed') {
      if(action.activationValue === 'Quit Fully') {
        isForceQuit = true;
        app.quit()
      }
    }
  });
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

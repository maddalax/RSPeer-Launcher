// Modules to control application life and create native browser window
const {app, BrowserWindow, Tray, Menu, Notification} = require('electron');
const path = require('path');
const Sentry = require('@sentry/electron');
const notifier = require('node-notifier');
const process = require('process');
const {isProd, isDev, isStaging} = require('./env');

const {dialog, shell} = require('electron');

if (isProd) {
    Sentry.init({dsn: 'https://6f43d99cb16342e6b38f4b0f634ae23c@sentry.io/1490824'});
}

process.on('uncaughtException', function (error) {
    isProd && Sentry.captureException(error);
    console.error(error);
    if(isProd) {
        dialog.showErrorBox('An uncaught error has occured. Please restart the launcher.', error.toString());
    }
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let loadingWindow;
let isQuitting;
let isForceQuit;
let isAlertActive;
let isHidden;
let hasAlertedMinimize;
let isWindows = process.platform === 'win32';
let tray;
const nc = new notifier.NotificationCenter();

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        title: 'RSPeer Launcher',
        vibrancy: 'dark',
        darkTheme: true,
        width: 800,
        height: 768,
        show: false,
        icon: path.join(__dirname, 'public', 'tray@2x.png'),
        webPreferences: {
            webSecurity: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.removeMenu();

    mainWindow.on('minimize', function (event) {
        if (!hasAlertedMinimize && isWindows) {
            tray.displayBalloon({
                title: 'RSPeer Launcher has been minimized to the tray.',
                content: 'To restore, click show on the RSPeer tray icon.',
                icon: path.join(__dirname, 'public', 'icon.png')
            });
            hasAlertedMinimize = true;
        }
        event.preventDefault();
        mainWindow.hide();
    });

    mainWindow.on('close', function (event) {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            isHidden = true;
            showNotQuitAlert();
            return false
        }
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
    } else if (isStaging) {
        mainWindow.loadURL('https://rspeer-launcher-dev.netlify.com');
    } else {
        mainWindow.loadURL('https://rspeer-launcher.netlify.com');
    }

    mainWindow.webContents.once('dom-ready', () => {
        setTimeout(() => {
            mainWindow.show();
            loadingWindow.hide();
            loadingWindow.close();
            loadingWindow = null;
        }, 800);
    });

    mainWindow.on('show', function () {
        isHidden = false;
    });

    mainWindow.on('hide', function () {
        isHidden = true;
    });

    mainWindow.on('closed', function () {
        mainWindow = null;
        loadingWindow = null;
    })
}

function createLoadingWindow() {

    tray = new Tray(path.join(__dirname, 'public', 'tray@2x.png'));
    tray.setToolTip('RSPeer Launcher');
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
    tray.on('clicked', function () {
        tray.popContextMenu();
    });
    loadingWindow = new BrowserWindow({show: false, frame: false, width: 620, height: 96, darkTheme: true});
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
        if (!showing) {
            loadingWindow.show();
        }
    }, 1000)
}

const isSingleton = app.requestSingleInstanceLock();

if (!isSingleton) {
    app.quit();
} else {

    app.on('second-instance', (event, command, dir) => {
        if (mainWindow) {
            if (mainWindow.isMinimized() || isHidden) mainWindow.show();
            mainWindow.focus();
        }
    });

    app.on('ready', createLoadingWindow);

    app.on('window-all-closed', function () {
        if (process.platform !== 'darwin') app.quit()
    });

    app.on('activate', function () {
        if (mainWindow === null) createLoadingWindow()
    });

    app.on('before-quit', function () {
        if (!isForceQuit) {
            showNotQuitAlert();
            return;
        }
        isQuitting = true;
    });
}


function showNotQuitAlert() {
    if (isAlertActive) {
        return;
    }
    isAlertActive = true;
    if (isWindows) {
        tray.displayBalloon({
            content: 'RSPeer Launcher needs to stay running to be able to launch clients remotely. To quit fully, click the task-bar icon and select quit.',
            title: 'RSPeer Launcher is still running.',
            icon: path.join(__dirname, 'public', 'icon.png')
        });
        return;
    }
    nc.notify({
        title: 'RSPeer Launcher is still running.',
        message: 'RSPeer Launcher needs to stay running to be able to launch clients to this computer remotely. To quit fully, click the task-bar icon and select quit.',
        icon: path.join(__dirname, 'public', 'tray@2x.png'),
        actions: ['More Info'],
        appID: 'org.rspeer.launcher',
        wait: true,
        timeout: 14400,
        sound: true,
        closeLabel: 'Quit Fully'
    }, function (err, res, action) {
        isAlertActive = false;
        if (!action) {
            return;
        }

        if (action.activationType === 'actionClicked') {
            if (action.activationValue === 'More Info') {
                shell.openExternal('https://rspeer.org/resources/rspeer-launcher-faq');
            }
        }
        if (action.activationType === 'closed') {
            if (action.activationValue === 'Quit Fully') {
                isForceQuit = true;
                app.quit()
            }
        }
    });
}

module.exports = {
    env : {
        isDev,
        isStaging,
        isProd
    }
};
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

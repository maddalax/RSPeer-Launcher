// Import React and ReactDOM
import React from 'react';
import * as Sentry from '@sentry/browser';
import ReactDOM from 'react-dom';

// Import Framework7
import Framework7 from 'framework7/framework7.esm.bundle';

// Import Framework7-React plugin
import Framework7React from 'framework7-react';

// Import main App component
import App from './components/App';

// Framework7 styles
import 'framework7/css/framework7.bundle.css';

// Icons
import './css/icons.css';

// Custom app styles
import './css/app.css';
import {getService} from "./Bottle";
import {WebsocketService} from "./services/WebsocketService";
import {DatabaseService} from "./services/DatabaseService";
import {isDev} from "./Config";

if(!isDev()) {
    Sentry.init({dsn: "https://907265de76094a54b2ce14522ca843fe@sentry.io/1490834"});
}

// Init Framework7-React plugin
Framework7.use(Framework7React);

// Mount React App
ReactDOM.render(
  React.createElement(App),
  document.getElementById('app'),
);

window.onbeforeunload = () => {
  shutdownApp();
};

export async function shutdownApp() {
    const service = getService<WebsocketService>('WebsocketService');
    const db = getService<DatabaseService>('Database');
    await service.disconnect();
    await db.close();
}
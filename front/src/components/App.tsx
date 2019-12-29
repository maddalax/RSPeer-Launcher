import React from 'react';

import {
  App,
  View
} from 'framework7-react';

import routes from '../Routes';

export default function (props : any) {
  
  // Framework7 parameters here
  const f7params : any = {
    id: 'org.rspeer.Launcher', // App bundle ID
    name: 'RSPeer Launcher', // App name
    theme: 'auto', // Automatic theme detection
    // App routes
    routes,
  };

  return (
    <App params={f7params} className={"theme-dark"}>
      <View id="main-view" url="/" main className="safe-areas"/>
    </App>
  );
};

// import { loadRemoteEntry } from "@angular-architects/module-federation";
Promise.all([
    // load remote necessary distant module.
    // loadRemoteEntry({ type: 'module', remoteEntry: 'http://localhost:4201/remoteEntry.js'})
])
    .then(() => import('./bootstrap'))
    .catch(err => console.error('error', err));

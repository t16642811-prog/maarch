const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

module.exports = withModuleFederationPlugin({
  name: "maarch-plugins",
  remotes: {
    "maarch-plugins-pdftron": "../../plugins/maarch-plugins-pdftron/remoteEntry.js",
    "maarch-plugins-fortify": "../../plugins/maarch-plugins-fortify/remoteEntry.js",
  },
  shared: {
    ...shareAll({ singleton: true, strictVersion: false, requiredVersion: 'auto' }),
  },
});


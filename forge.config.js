require('dotenv').config(); // Load environment variables from .env (optional, if using dotenv)

const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    extraResources: [
      {
        from: 'node_modules/electron-updater',
        to: 'electron-updater'
      }
    ],
    nodeModulesPath: 'node_modules'
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'aviator_bot',
        authors: 'Aviator Bot', // Required: Replace with your name or company
        description: 'Bot for Aviator predictions', // Recommended: Brief description
        version: '1.0.1', // Ensure this matches your package.json version
        owners: 'NdeNifty', // Optional: Your GitHub username or organization
        projectUrl: 'https://github.com/NdeNifty/AviatorElectron', // Optional: Link to your project
        licenseUrl: 'https://github.com/NdeNifty/AviatorElectron/blob/main/LICENSE', // Optional: Link to license
        releaseNotes: 'Initial release of Aviator Bot' // Optional: Release notes for the installer
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    {
      name: '@electron-forge/maker-deb',
      config: {}
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {}
    }
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'NdeNifty',
          name: 'AviatorElectron'
        },
        draft: true
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {}
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true
    })
  ]
};
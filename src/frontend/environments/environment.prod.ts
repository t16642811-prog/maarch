import packageJson from '../../../package.json';

export const environment = {
    production: true,
    VERSION: packageJson.version,
    BASE_VERSION: packageJson.version.split('.')[0],
    AUTHOR: packageJson.author
};

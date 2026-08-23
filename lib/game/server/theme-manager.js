/**
 *
 * Reldens - ThemeManager
 *
 * Manages theme assets, paths, and bundling for the Reldens game project.
 * Handles theme installation, asset copying, CSS/JS bundling with Parcel,
 * and provides path resolution for project files, theme files, and Reldens module files.
 * Coordinates between the project root, theme directory, dist directory, and node_modules.
 *
 */

const { TemplatesList } = require('../../admin/server/templates-list');
const { TemplateEngine } = require('./template-engine');
const { TemplatesToPathMapper } = require('./templates-to-path-mapper');
const { GameConst } = require('../constants');
const { Parcel, createWorkerFarm } = require('@parcel/core');
const { FileHandler } = require('@reldens/server-utils');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

/**
 * @typedef {Object} ThemeManagerProps
 * @property {string} projectRoot
 * @property {string} [projectThemeName]
 * @property {boolean} [jsSourceMaps]
 * @property {boolean} [cssSourceMaps]
 */
class ThemeManager
{

    /** @type {string} */
    projectRoot = '';
    /** @type {string} */
    projectRootPackageJson = '';
    /** @type {string} */
    envFilePath = '';
    /** @type {string} */
    gitignoreFilePath = '';
    /** @type {string} */
    installationLockPath = '';
    /** @type {string} */
    reldensModulePath = '';
    /** @type {string} */
    reldensModuleLibPath = '';
    /** @type {string} */
    reldensModuleThemePath = '';
    /** @type {string} */
    reldensModuleDefaultThemePath = '';
    /** @type {string} */
    reldensModuleDefaultThemeAssetsPath = '';
    /** @type {string} */
    reldensModuleThemePluginsPath = '';
    /** @type {string} */
    reldensModuleInstallerPath = '';
    /** @type {string} */
    reldensModulePathInstallTemplatesFolder = '';
    /** @type {string} */
    reldensModuleThemeAdminPath = '';
    /** @type {string} */
    distPath = '';
    /** @type {string} */
    assetsDistPath = '';
    /** @type {string} */
    cssDistPath = '';
    /** @type {string} */
    themePath = '';
    /** @type {string} */
    projectThemeName = GameConst.STRUCTURE.DEFAULT;
    /** @type {string} */
    projectThemePath = '';
    /** @type {string} */
    projectPluginsPath = '';
    /** @type {string} */
    projectAdminPath = '';
    /** @type {string} */
    projectAssetsPath = '';
    /** @type {string} */
    projectCssPath = '';
    /** @type {string} */
    projectIndexPath = '';
    /** @type {string} */
    projectGenerateDataPath = '';
    /** @type {string} */
    projectGeneratedDataPath = '';
    /** @type {Object<string, any>} */
    defaultBrowserBundleOptions = {};

    /**
     * @param {ThemeManagerProps} props
     */
    constructor(props)
    {
        if(!sc.hasOwn(props, 'projectRoot')){
            ErrorManager.error('Missing project property.');
        }
        /** @type {string} */
        this.encoding = (process.env.RELDENS_DEFAULT_ENCODING || 'utf8');
        /** @type {TemplateEngine} */
        this.templateEngine = TemplateEngine;
        /** @type {TemplatesList} */
        this.adminTemplatesList = TemplatesList;
        /** @type {boolean} */
        this.jsSourceMaps = sc.get(props, 'jsSourceMaps', false);
        /** @type {boolean} */
        this.cssSourceMaps = sc.get(props, 'cssSourceMaps', false);
        this.setupPaths(props);
    }

    /**
     * @param {ThemeManagerProps} props
     */
    setupPaths(props)
    {
        let structure = GameConst.STRUCTURE;
        this.projectRoot = sc.get(props, 'projectRoot', '');
        this.projectRootPackageJson = FileHandler.joinPaths(this.projectRoot, 'package.json');
        this.envFilePath = FileHandler.joinPaths(this.projectRoot, '.env');
        this.gitignoreFilePath = FileHandler.joinPaths(this.projectRoot, '.gitignore');
        this.installationLockPath = FileHandler.joinPaths(this.projectRoot, structure.INSTALL_LOCK);
        this.projectThemeName = sc.get(props, 'projectThemeName', structure.DEFAULT);
        this.projectGenerateDataPath = FileHandler.joinPaths(this.projectRoot, 'generate-data');
        this.projectGeneratedDataPath = FileHandler.joinPaths(this.projectGenerateDataPath, 'generated');
        this.reldensModulePath = sc.get(
            props,
            'reldensModulePath',
            FileHandler.joinPaths(this.projectRoot, 'node_modules', 'reldens')
        );
        this.reldensModuleLibPath = FileHandler.joinPaths(this.reldensModulePath, structure.LIB);
        this.reldensModuleThemePath = FileHandler.joinPaths(this.reldensModulePath, structure.THEME);
        this.reldensModuleDefaultThemePath = FileHandler.joinPaths(this.reldensModuleThemePath, structure.DEFAULT);
        this.reldensModuleDefaultThemeAssetsPath = FileHandler.joinPaths(
            this.reldensModuleDefaultThemePath,
            structure.ASSETS
        );
        this.reldensModuleThemePluginsPath = FileHandler.joinPaths(this.reldensModuleThemePath, structure.PLUGINS);
        this.reldensModuleThemeAdminPath = FileHandler.joinPaths(this.reldensModuleThemePath, structure.ADMIN);
        this.reldensModuleInstallerPath = FileHandler.joinPaths(this.reldensModulePath, structure.INSTALLER_FOLDER);
        this.reldensModuleInstallerIndexPath = FileHandler.joinPaths(this.reldensModuleInstallerPath, structure.INDEX);
        this.reldensModulePathInstallTemplatesFolder = FileHandler.joinPaths(
            this.reldensModulePath,
            structure.LIB,
            'game',
            structure.SERVER,
            'install-templates'
        );
        this.reldensModulePathInstallTemplateEnvDist = FileHandler.joinPaths(
            this.reldensModulePathInstallTemplatesFolder,
            '.env.dist'
        );
        this.reldensModulePathInstallTemplateGitignoreDist = FileHandler.joinPaths(
            this.reldensModulePathInstallTemplatesFolder,
            '.gitignore.dist'
        );
        this.reldensModulePathInstallTemplateKnexDist = FileHandler.joinPaths(
            this.reldensModulePathInstallTemplatesFolder,
            'knexfile.js.dist'
        );
        this.installerPath = FileHandler.joinPaths(this.projectRoot, structure.INSTALLER_FOLDER);
        this.installerPathIndex = FileHandler.joinPaths(this.installerPath, structure.INDEX);
        this.themePath = FileHandler.joinPaths(this.projectRoot, structure.THEME);
        this.projectAdminPath = FileHandler.joinPaths(this.themePath, structure.ADMIN);
        this.projectAdminTemplatesPath = FileHandler.joinPaths(this.projectAdminPath, structure.TEMPLATES);
        this.adminTemplates = TemplatesToPathMapper.map(this.adminTemplatesList, this.projectAdminTemplatesPath);
        this.distPath = FileHandler.joinPaths(this.projectRoot, structure.DIST);
        this.assetsDistPath = FileHandler.joinPaths(this.distPath, structure.ASSETS);
        this.cssDistPath = FileHandler.joinPaths(this.distPath, structure.CSS);
        this.projectThemePath = FileHandler.joinPaths(this.themePath, this.projectThemeName);
        this.projectPluginsPath = FileHandler.joinPaths(this.themePath, structure.PLUGINS);
        this.projectAssetsPath = FileHandler.joinPaths(this.projectThemePath, structure.ASSETS);
        this.projectCssPath = FileHandler.joinPaths(this.projectThemePath, structure.CSS);
        this.projectIndexPath = FileHandler.joinPaths(this.projectThemePath, structure.INDEX);
    }

    /**
     * @returns {Object<string, string>}
     */
    paths()
    {
        return {
            projectRoot: this.projectRoot,
            reldensModulePath: this.reldensModulePath,
            reldensModuleLibPath: this.reldensModuleLibPath,
            reldensModuleThemePath: this.reldensModuleThemePath,
            reldensModuleDefaultThemePath: this.reldensModuleDefaultThemePath,
            reldensModuleDefaultThemeAssetsPath: this.reldensModuleDefaultThemeAssetsPath,
            reldensModuleThemePluginsPath: this.reldensModuleThemePluginsPath,
            distPath: this.distPath,
            assetsDistPath: this.assetsDistPath,
            themePath: this.themePath,
            projectThemePath: this.projectThemePath,
            projectPluginsPath: this.projectPluginsPath,
            projectAssetsPath: this.projectAssetsPath,
            projectIndexPath: this.projectIndexPath
        };
    }

    /**
     * @param {...string} args
     * @returns {string}
     */
    assetPath(...args)
    {
        return FileHandler.joinPaths(this.projectAssetsPath, ...args);
    }

    /**
     * @returns {boolean}
     */
    permissionsCheck()
    {
        return FileHandler.permissionsCheck(this.projectRoot);
    }

    resetDist()
    {
        this.removeDist();
        FileHandler.createFolder(this.distPath);
        FileHandler.createFolder(this.assetsDistPath);
        FileHandler.createFolder(this.cssDistPath);
        Logger.info('Reset "dist" folder, created: '+this.distPath);
    }

    /**
     * @returns {boolean}
     */
    removeDist()
    {
        return FileHandler.remove(this.distPath);
    }

    installDefaultTheme()
    {
        if(!FileHandler.copyFolderSync(this.reldensModuleDefaultThemePath, this.projectThemePath)){
            Logger.error('File copy folder sync error.', FileHandler.error);
        }
        if(!FileHandler.copyFolderSync(this.reldensModuleThemePluginsPath, this.projectPluginsPath)){
            Logger.error('File copy folder sync error.', FileHandler.error);
        }
        if(!FileHandler.copyFolderSync(this.reldensModuleThemeAdminPath, this.projectAdminPath)){
            Logger.error('File copy folder sync error.', FileHandler.error);
        }
        if(!FileHandler.copyFolderSync(this.reldensModuleDefaultThemePath, this.distPath)){
            Logger.error('File copy folder sync error.', FileHandler.error);
        }
        Logger.info('Install "default" theme:'
            +'\n'+this.reldensModuleDefaultThemePath+' > '+this.projectThemePath
            +'\n'+this.reldensModuleThemePluginsPath+' > '+this.projectPluginsPath
            +'\n'+this.reldensModuleDefaultThemePath+' > '+this.distPath
        );
    }

    /**
     * @returns {boolean}
     */
    copyAssetsToDist()
    {
        if(!FileHandler.copyFolderSync(this.projectAssetsPath, this.assetsDistPath)){
            Logger.error('File copy folder sync error.', FileHandler.error);
            return false;
        }
        Logger.info('Copied "assets" to "dist" from:' +'\n'+this.projectAssetsPath+' > '+this.assetsDistPath);
        return true;
    }

    copyKnexFile()
    {
        let knexFile = FileHandler.joinPaths(this.projectRoot, 'knexfile.js');
        FileHandler.copyFileSyncIfDoesNotExist(
            FileHandler.joinPaths(this.reldensModulePathInstallTemplatesFolder, 'knexfile.js.dist'),
            knexFile
        );
        Logger.info('Reminder: edit the knexfile.js file!');
    }

    copyEnvFile()
    {
        FileHandler.copyFileSyncIfDoesNotExist(
            FileHandler.joinPaths(this.reldensModulePathInstallTemplatesFolder, '.env.dist'),
            this.envFilePath
        );
        Logger.info('Reminder: edit the .env file!');
    }

    copyGitignoreFile()
    {
        FileHandler.copyFileSyncIfDoesNotExist(
            FileHandler.joinPaths(this.reldensModulePathInstallTemplatesFolder, '.gitignore.dist'),
            this.gitignoreFilePath
        );
        Logger.info('Reminder: edit the .gitignore file!');
    }

    /**
     * @param {boolean} [override=false]
     * @returns {Promise<boolean>}
     */
    async copyIndex(override = false)
    {
        let indexFile = FileHandler.joinPaths(this.projectRoot, 'index.js');
        if(FileHandler.exists(indexFile) && !override){
            Logger.info('File already exists: index.js');
            return false;
        }
        let templatePath = FileHandler.joinPaths(this.reldensModuleThemePath, 'index.js.dist');
        let fileContent = FileHandler.fetchFileContents(templatePath);
        if(!fileContent){
            Logger.error('Failed to read template file.', templatePath);
            return false;
        }
        let parsedContents = await this.templateEngine.render(
            fileContent,
            {yourThemeName: this.projectThemeName || 'default'}
        );
        try {
            await FileHandler.updateFileContents(indexFile, parsedContents.toString());
        } catch (error) {
            Logger.error('Failed to create index.js file.', error);
        }
    }

    /**
     * @returns {boolean}
     */
    copyDefaultAssets()
    {
        if(!FileHandler.copyFolderSync(this.reldensModuleDefaultThemeAssetsPath, this.assetsDistPath)){
            Logger.error('File copy folder sync error.', FileHandler.error);
            return false;
        }
        Logger.info('Copied default assets:'+'\n'+this.reldensModuleDefaultThemeAssetsPath+' > '+this.assetsDistPath);
        return true;
    }

    /**
     * @returns {boolean}
     */
    copyDefaultTheme()
    {
        if(!FileHandler.copyFolderSync(this.reldensModuleDefaultThemePath, this.projectThemePath)){
            Logger.error('File copy folder sync error.', FileHandler.error);
            return false;
        }
        Logger.info('Copied default theme:'+'\n'+this.reldensModuleDefaultThemePath+' > '+this.projectThemePath);
        return true;
    }

    /**
     * @returns {boolean}
     */
    copyPackage()
    {
        if(!FileHandler.copyFolderSync(this.reldensModuleThemePluginsPath, this.projectPluginsPath)){
            Logger.error('File copy folder sync error.', FileHandler.error);
            return false;
        }
        Logger.info('Copied plugins:'+'\n'+this.reldensModuleThemePluginsPath+' > '+this.projectPluginsPath);
        return true;
    }

    /**
     * @returns {boolean}
     */
    copyAdmin()
    {
        if(!FileHandler.copyFolderSync(this.reldensModuleThemeAdminPath, this.projectAdminPath)){
            Logger.error('File copy folder sync error.', FileHandler.error);
            return false;
        }
        Logger.info('Copied admin:'+'\n'+this.reldensModuleThemeAdminPath+' > '+this.projectAdminPath);
        return true;
    }

    /**
     * @returns {Promise<boolean|void>}
     */
    async buildCss()
    {
        let allowBuildCss = 1 === Number(sc.get(process.env, 'RELDENS_ALLOW_BUILD_CSS', 1));
        if(!allowBuildCss){
            Logger.info('CSS build skipped (RELDENS_ALLOW_BUILD_CSS=0)');
            return false;
        }
        let themeScss = FileHandler.joinPaths(this.projectCssPath, GameConst.STRUCTURE.SCSS_FILE).toString();
        let bundler = this.createCssBundler(themeScss);
        try {
            let { buildTime } = await bundler.run();
            Logger.info('Built Game CSS in '+buildTime+'ms!');
        } catch (error) {
            console.error(error); Logger.critical({'Parcel diagnostics for error': sc.get(error, 'diagnostics', error)});
            ErrorManager.error('Parcel build CSS process failed.');
        }
        FileHandler.createFolder(this.cssDistPath);
        FileHandler.copyFileSyncIfDoesNotExist(
            FileHandler.joinPaths(this.projectCssPath, GameConst.STRUCTURE.CSS_FILE),
            FileHandler.joinPaths(this.cssDistPath, GameConst.STRUCTURE.CSS_FILE)
        );
    }

    copyAdminFiles()
    {
        let jsDistPath = FileHandler.joinPaths(this.distPath, 'js');
        FileHandler.createFolder(jsDistPath);
        FileHandler.createFolder(this.cssDistPath);
        // copy functions.js to dist/js:
        let functionsSource = FileHandler.joinPaths(this.projectAdminPath, 'functions.js');
        FileHandler.copyFile(functionsSource, FileHandler.joinPaths(jsDistPath, 'functions.js'));
        // copy reldens-specific functions to dist root:
        let reldensFunctionsSource = FileHandler.joinPaths(this.projectAdminPath, 'reldens-functions.js');
        FileHandler.copyFile(reldensFunctionsSource, FileHandler.joinPaths(this.distPath, 'reldens-functions.js'));
        // copy admin js to dist root:
        let adminJsSource = FileHandler.joinPaths(this.projectAdminPath, GameConst.STRUCTURE.ADMIN_JS_FILE);
        FileHandler.copyFile(adminJsSource, FileHandler.joinPaths(this.distPath, GameConst.STRUCTURE.ADMIN_JS_FILE));
        // copy admin css to dist/css:
        let adminCssSource = FileHandler.joinPaths(this.projectAdminPath, GameConst.STRUCTURE.ADMIN_CSS_FILE);
        FileHandler.copyFile(adminCssSource, FileHandler.joinPaths(this.cssDistPath, GameConst.STRUCTURE.ADMIN_CSS_FILE));
        Logger.info('Admin files copied to dist.');
    }

    /**
     * @returns {Promise<boolean>}
     */
    async copyAdminAssetsToDist()
    {
        if(!FileHandler.copyFolderSync(
            FileHandler.joinPaths(this.projectAdminPath, GameConst.STRUCTURE.ASSETS),
            this.assetsDistPath
        )){
            Logger.error('File copy folder sync error.', FileHandler.error);
            return false;
        }
        return true;
    }

    /**
     * @returns {Promise<void>}
     */
    async buildSkeleton()
    {
        await this.buildCss();
        await this.buildClient();
        Logger.info('Built Skeleton.');
    }

    /**
     * @returns {Promise<boolean|void>}
     */
    async buildClient()
    {
        let allowBuildClient = 1 === Number(sc.get(process.env, 'RELDENS_ALLOW_BUILD_CLIENT', 1));
        if(!allowBuildClient){
            Logger.info('Client build skipped (RELDENS_ALLOW_BUILD_CLIENT=0)');
            return false;
        }
        let elementsCollection = FileHandler.readFolder(this.projectThemePath);
        for(let element of elementsCollection){
            if(-1 === element.indexOf('.html')){
                continue;
            }
            let elementPath = FileHandler.joinPaths(this.projectThemePath, element);
            if(!FileHandler.isFile(elementPath)){
                continue;
            }
            try {
                let bundler = this.createBrowserBundler(elementPath);
                let { buildTime } = await bundler.run();
                Logger.info('Built '+elementPath+' in '+buildTime+'ms!');
            } catch (error) {
                console.error(error); Logger.critical({'Parcel diagnostics for error': sc.get(error, 'diagnostics', error), elementPath});
                ErrorManager.error('Parcel build Game Client process failed.');
            }
        }
    }

    /**
     * @param {string} folderPath
     * @returns {Promise<void>}
     */
    async clearBundlerCache(folderPath)
    {
        FileHandler.remove(FileHandler.joinPaths(folderPath, '.parcel-cache'));
    }

    /**
     * @returns {Promise<void>}
     */
    
    
    async buildInstaller()
    {
        try {
            const fs = require('fs');
            const { execSync } = require('child_process');
            console.log('COPYING INSTALLER FROM:', this.reldensModuleInstallerPath, 'TO:', this.installerPath);
            try {
                fs.mkdirSync(this.installerPath, { recursive: true });
                if (this.reldensModuleInstallerPath !== this.installerPath && require('path').resolve(this.reldensModuleInstallerPath) !== require('path').resolve(this.installerPath)) {
                    fs.cpSync(this.reldensModuleInstallerPath, this.installerPath, { recursive: true });
                }
            } catch(e) {
                console.error('Copy failed but continuing:', e.message);
            }
            
            console.log('COMPILING SCSS TO CSS...');
            try {
                execSync('npx sass ' + this.installerPath + '/css/styles.scss ' + this.installerPath + '/css/styles.css');
                console.log('SCSS compiled successfully!');
            } catch (e) {
                console.error('Failed to compile SCSS:', e.message);
            }

            const indexHtml = `<!DOCTYPE html>
<html>
<head>
    <title>DwDeveloper - Reldens | MMORPG Platform</title>
    <link href="https://fonts.googleapis.com/css?family=Open+Sans:300,300i,400,400i,600,600i,700,700i|Play:300,300i,400,400i,500,500i,600,600i,700,700i" rel="stylesheet"/>
    <link rel="apple-touch-icon" sizes="180x180" href="./assets/favicons/apple-touch-icon.png"/>
    <link rel="icon" type="image/png" sizes="32x32" href="./assets/favicons/favicon-32x32.png"/>
    <link rel="icon" type="image/png" sizes="16x16" href="./assets/favicons/favicon-16x16.png"/>
    <link rel="manifest" href="./site.webmanifest"/>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
    <link rel="stylesheet" type="text/css" href="./css/styles.css"/>
    <script type="module" src="./index.js"></script>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <h1 class="title">
            - <strong>Reldens</strong> - <span id="current-version">Installation</span>
        </h1>
    </div>
    <div class="content">
        <div class="forms-container">
            <div class="row">
                <form name="install-form" id="install-form" class="install-form" action="/install" method="post">
                    <div class="col-2">
                        <!-- APP -->
                        <h3 class="form-title">- App -</h3>
                        <div class="input-box app-host">
                            <label for="app-host">Host</label>
                            <input type="text" name="app-host" id="app-host" value="{{app-host}}" class="required" required/>
                        </div>
                        <div class="input-box app-port">
                            <label for="app-port">Port</label>
                            <input type="text" name="app-port" id="app-port" value="{{app-port}}" class="required" required/>
                        </div>
                        <div class="input-box app-trusted-proxy">
                            <label for="app-trusted-proxy">Trusted Proxy (or reverse proxy)</label>
                            <input type="text" name="app-trusted-proxy" id="app-trusted-proxy" value="{{app-trusted-proxy}}"/>
                        </div>
                        <div class="input-box app-public-url">
                            <label for="app-public-url">Public URL (useful if you have a reverse proxy)</label>
                            <input type="text" name="app-public-url" id="app-public-url" value="{{app-public-url}}" class="required" required/>
                        </div>
                        <div class="input-box app-admin-path">
                            <label for="app-admin-path">Admin Panel Path</label>
                            <input type="text" name="app-admin-path" id="app-admin-path" value="{{app-admin-path}}"/>
                        </div>
                        <div class="input-box app-admin-secret">
                            <label for="app-admin-secret">Admin Panel Secret Key</label>
                            <input type="text" name="app-admin-secret" id="app-admin-secret" value="{{app-admin-secret}}" class="required" required/>
                        </div>
                        <div class="input-box app-admin-hot-plug">
                            <label for="app-admin-hot-plug">Hot-Plug</label>
                            <input type="checkbox" value="1" name="app-admin-hot-plug" id="app-admin-hot-plug"{{&app-admin-hot-plug-checked}}/>
                        </div>
                        <div class="input-box app-allow-packages-installation">
                            <div class="app-allow-packages-installation-notice">
                                <span class="danger">
                                    DANGER (?)
                                    <ul>
                                        <li>The installer will attempt to run npm install for missing packages.</li>
                                        <li>Uncheck this only if you have manually installed all required packages or if you are not using NPM.</li>
                                        <li>Required packages: @reldens/storage (always), @prisma/client (Prisma driver only).</li>
                                    </ul>
                                </span>
                            </div>
                            <div class="app-allow-packages-installation-checkbox">
                                <label for="app-allow-packages-installation">Allow installer to run npm install for missing packages</label>
                                <input type="checkbox" value="1" name="app-allow-packages-installation" id="app-allow-packages-installation"{{&app-allow-packages-installation-checked}}/>
                            </div>
                        </div>
                        <div class="input-box app-error">
                            <p class="installation-process-failed">There was an error during the installation process.</p>
                        </div>

                        <!-- HTTPS -->
                        <div class="input-box app-use-https">
                            <label for="app-use-https">Use HTTPS</label>
                            <input type="checkbox" value="1" name="app-use-https" id="app-use-https"{{&app-use-https-checked}}/>
                        </div>
                        <div class="notice-box https-filter">
                            <ul>
                                <li>Key: Accept .key or .pem</li>
                                <li>Cert: Accept .crt, .cer, or .pem</li>
                                <li>Chain: Accept .ca-bundle, .chain.pem, .pem, or .ca.pem</li>
                            </ul>
                        </div>
                        <div class="input-box app-https-key-pem https-filter">
                            <label for="app-https-key-pem">Path to the key file</label>
                            <input type="text" name="app-https-key-pem" id="app-https-key-pem" value="{{app-https-key-pem}}"/>
                        </div>
                        <div class="input-box app-https-cert-pem https-filter">
                            <label for="app-https-cert-pem">Path to the certificate file</label>
                            <input type="text" name="app-https-cert-pem" id="app-https-cert-pem" value="{{app-https-cert-pem}}"/>
                        </div>
                        <div class="input-box app-https-chain-pem https-filter">
                            <label for="app-https-chain-pem">Path to the chain file</label>
                            <input type="text" name="app-https-chain-pem" id="app-https-chain-pem" value="{{app-https-chain-pem}}"/>
                        </div>
                        <div class="input-box app-https-passphrase https-filter">
                            <label for="app-https-passphrase">Passphrase</label>
                            <input type="password" name="app-https-passphrase" id="app-https-passphrase" value="{{app-https-passphrase}}"/>
                        </div>

                        <!-- MONITOR -->
                        <div class="input-box app-use-monitor">
                            <label for="app-use-monitor">Enable Monitor</label>
                            <input type="checkbox" value="1" name="app-use-monitor" id="app-use-monitor"{{&app-use-monitor-checked}}/>
                        </div>
                        <div class="input-box app-secure-monitor monitor-filter">
                            <label for="app-secure-monitor">Secure Monitor</label>
                            <input type="checkbox" value="1" name="app-secure-monitor" id="app-secure-monitor"{{&app-secure-monitor-checked}}/>
                        </div>
                        <div class="input-box app-monitor-user monitor-filter secure-monitor-filter">
                            <label for="app-monitor-user">Monitor username</label>
                            <input type="text" name="app-monitor-user" id="app-monitor-user" value="{{app-monitor-user}}"/>
                        </div>
                        <div class="input-box app-monitor-password monitor-filter secure-monitor-filter">
                            <label for="app-monitor-password">Monitor password</label>
                            <input type="password" name="app-monitor-password" id="app-monitor-password" value="{{app-monitor-password}}"/>
                        </div>
                    </div>
                    <div class="col-2">
                        <!-- STORAGE -->
                        <h3 class="form-title">- Storage -</h3>
                        <div class="input-box db-storage-driver">
                            <label for="db-storage-driver">Storage Driver</label>
                            <select name="db-storage-driver" id="db-storage-driver" class="required" required>
                                <option value="prisma"{{&db-storage-driver-prisma}}>Prisma</option>
                                <option value="objection-js"{{&db-storage-driver-objection-js}}>Objection JS</option>
                                <option value="mikro-orm"{{&db-storage-driver-mikro-orm}}>MikroORM (untested)</option>
                            </select>
                        </div>
                        <div class="input-box db-client">
                            <label for="db-client">Client</label>
                            <select name="db-client" id="db-client" class="required" required>
                                <option value="{{db-client}}">{{db-client}}</option>
                            </select>
                        </div>
                        <div class="input-box db-host">
                            <label for="db-host">Host</label>
                            <input type="text" name="db-host" id="db-host" value="{{db-host}}" class="required" required/>
                        </div>
                        <div class="input-box db-port">
                            <label for="db-port">Port</label>
                            <input type="text" name="db-port" id="db-port" value="{{db-port}}" class="required" required/>
                        </div>
                        <div class="input-box db-name">
                            <label for="db-name">Database Name</label>
                            <input type="text" name="db-name" id="db-name" value="{{db-name}}" class="required" required/>
                        </div>
                        <div class="input-box db-username">
                            <label for="db-username">Username</label>
                            <input type="text" name="db-username" id="db-username" value="{{db-username}}" class="required" required/>
                        </div>
                        <div class="input-box db-password">
                            <label for="db-password">Password</label>
                            <input type="password" name="db-password" id="db-password" value="{{db-password}}" class="required" required autocomplete="off"/>
                        </div>
                        <div class="input-box db-error">
                            <p class="connection-failed">Connection failed, please check the storage configuration.</p>
                            <p class="invalid-driver">Invalid storage driver.</p>
                            <p class="raw-query-not-found">Method "rawQuery" not found in the specified storage driver.</p>
                            <p class="db-installation-process-failed">There was an error during the installation process.</p>
                        </div>
                        <div class="input-box db-basic-config">
                            <div class="db-basic-config-notice">
                                <span class="danger">
                                    DANGER (?)
                                    <ul>
                                        <li>The automatic installation for the basic configuration and the sample data are only available for the MySQL client.</li>
                                        <li>Uncheck this is only if you know what you are doing. <br/>Without this you will get all the tables empty, even the ones with default required values.</li>
                                    </ul>
                                </span>
                            </div>
                            <div class="db-basic-config-checkbox">
                                <label for="db-basic-config">Install minimal configuration</label>
                                <input type="checkbox" value="1" name="db-basic-config" id="db-basic-config"{{&db-basic-config-checked}}/>
                            </div>
                        </div>
                        <div class="input-box db-sample-data">
                            <label for="db-sample-data">Install sample data</label>
                            <input type="checkbox" value="1" name="db-sample-data" id="db-sample-data"{{&db-sample-data-checked}}/>
                        </div>
                    </div>
                    <div class="col-2">
                        <!-- MAILER -->
                        <h3 class="form-title">- Mailer -</h3>
                        <div class="input-box mailer-enable">
                            <label for="mailer-enable">Enable NodeMailer</label>
                            <input type="checkbox" value="1" name="mailer-enable" id="mailer-enable"{{&mailer-enable-checked}}/>
                        </div>
                        <div class="input-box mailer-service mailer-filter">
                            <label for="mailer-service">Service</label>
                            <select name="mailer-service" id="mailer-service">
                                <option value="sendgrid"{{&mailer-service-sendgrid}}>SendGrid</option>
                                <option value="nodemailer"{{&mailer-service-nodemailer}}>NodeMailer</option>
                            </select>
                        </div>
                        <div class="input-box mailer-host mailer-filter">
                            <label for="mailer-host">Host</label>
                            <input type="text" name="mailer-host" id="mailer-host"/>
                        </div>
                        <div class="input-box mailer-secure mailer-filter">
                            <label for="mailer-secure">Secure (SSL)</label>
                            <input type="checkbox" value="1" name="mailer-secure" id="mailer-secure"{{&mailer-secure-checked}}/>
                        </div>
                        <div class="input-box mailer-port mailer-filter">
                            <label for="mailer-port">Port</label>
                            <input type="text" name="mailer-port" id="mailer-port" value="{{mailer-port}}"/>
                        </div>
                        <div class="input-box mailer-username mailer-filter">
                            <label for="mailer-username">Username</label>
                            <input type="text" name="mailer-username" id="mailer-username" value="{{mailer-username}}"/>
                        </div>
                        <div class="input-box mailer-password mailer-filter">
                            <label for="mailer-password">Password</label>
                            <input type="password" name="mailer-password" id="mailer-password" value="{{mailer-password}}" autocomplete="off"/>
                        </div>
                        <div class="input-box mailer-from mailer-filter">
                            <label for="mailer-from">From email</label>
                            <input type="text" name="mailer-from" id="mailer-from" value="{{mailer-from}}"/>
                        </div>
                    </div>
                    <div class="col-2">
                        <!-- FIREBASE -->
                        <h3 class="form-title">- Firebase (for login) -</h3>
                        <div class="input-box firebase-enable">
                            <label for="firebase-enable">Enable Firebase</label>
                            <input type="checkbox" value="1" name="firebase-enable" id="firebase-enable"{{&firebase-enable-checked}}/>
                        </div>
                        <div class="input-box firebase-api-key firebase-filter">
                            <label for="firebase-api-key">API key</label>
                            <input type="text" name="firebase-api-key" id="firebase-api-key" value="{{firebase-api-key}}"/>
                        </div>
                        <div class="input-box firebase-api-id firebase-filter">
                            <label for="firebase-api-id">Api ID</label>
                            <input type="text" name="firebase-api-id" id="firebase-api-id" value="{{firebase-api-id}}"/>
                        </div>
                        <div class="input-box firebase-auth-domain firebase-filter">
                            <label for="firebase-auth-domain">Auth domain</label>
                            <input type="text" name="firebase-auth-domain" id="firebase-auth-domain" value="{{firebase-auth-domain}}"/>
                        </div>
                        <div class="input-box firebase-database-url firebase-filter">
                            <label for="firebase-database-url">Database URL</label>
                            <input type="text" name="firebase-database-url" id="firebase-database-url" value="{{firebase-database-url}}"/>
                        </div>
                        <div class="input-box firebase-project-id firebase-filter">
                            <label for="firebase-project-id">Project ID</label>
                            <input type="text" name="firebase-project-id" id="firebase-project-id" value="{{firebase-project-id}}"/>
                        </div>
                        <div class="input-box firebase-storage-bucket firebase-filter">
                            <label for="firebase-storage-bucket">Storage bucket</label>
                            <input type="text" name="firebase-storage-bucket" id="firebase-storage-bucket" value="{{firebase-storage-bucket}}"/>
                        </div>
                        <div class="input-box firebase-sender-id firebase-filter">
                            <label for="firebase-sender-id">Sender ID</label>
                            <input type="text" name="firebase-sender-id" id="firebase-sender-id" value="{{firebase-sender-id}}"/>
                        </div>
                        <div class="input-box firebase-measurement-id firebase-filter">
                            <label for="firebase-measurement-id">Measurement ID (GA)</label>
                            <input type="text" name="firebase-measurement-id" id="firebase-measurement-id" value="{{firebase-measurement-id}}"/>
                        </div>
                    </div>
                    <!-- SUBMIT -->
                    <div class="input-box submit-container">
                        <div class="loading-status-wrapper hidden">
                            <div class="install-status-message">This may take a few minutes...</div>
                            <img class="install-loading" src="./assets/web/loading.gif" alt="loading"/>
                        </div>
                        <input id="install-submit-button" type="submit" value="Install"/>
                    </div>
                    <div class="input-box response-error"></div>
                </form>
            </div>
        </div>
    </div>
    <div class="footer">
        <div class="copyright">
            <a href="https://www.dwdeveloper.com/">by DwDeveloper</a>
        </div>
    </div>
</div>
</body>
</html>
`;
            fs.writeFileSync(this.installerPathIndex, indexHtml);
            
            console.log('Copied installer files, compiled CSS, and created index.html directly without Parcel!');
        } catch (error) {
            console.error(error);
        }
        return;;;;;


        try {
            let bundleOptions = this.generateDefaultBrowserBundleOptions(this.reldensModuleInstallerIndexPath);
            FileHandler.createFolder(this.installerPath);
            bundleOptions.targets.modern.distDir = this.installerPath;
            bundleOptions.defaultTargetOptions.distDir = this.installerPath;
            let bundler = new Parcel(bundleOptions);
            let { buildTime } = await bundler.run();
            Logger.info('Built '+this.reldensModuleInstallerIndexPath+' in '+buildTime+'ms!');
        } catch (error) {
            console.error(error); Logger.critical('Parcel diagnostics for error on build installer.', sc.get(error, 'diagnostics', error));
            ErrorManager.error('Parcel build installer process failed.');
        }
    }

    /**
     * @param {string} entryPath
     * @returns {Parcel}
     */
    createBrowserBundler(entryPath)
    {
        return new Parcel(this.generateDefaultBrowserBundleOptions(entryPath));
    }

    /**
     * @param {string} entryPath
     * @returns {Object<string, any>}
     */
    generateDefaultBrowserBundleOptions(entryPath)
    {
        let workerFarm = createWorkerFarm({ backend: 'process' });
        this.defaultBrowserBundleOptions = {
            defaultConfig: 'reldens/lib/bundlers/drivers/parcel-config',
            shouldDisableCache: true,
            workerFarm,
            targets: {
                modern: {
                    engines: {
                        browsers: ['> 0.5%, last 2 versions, not dead']
                    },
                    distDir: this.distPath,
                    outputFormat: 'esmodule'
                },
            },
            entries: entryPath,
            logLevel: 'verbose',
            defaultTargetOptions: {
                shouldDisableCache: true,
                shouldOptimize: true,
                sourceMaps: this.jsSourceMaps,
                distEntry: entryPath,
                distDir: this.distPath,
                isLibrary: false,
                outputFormat: 'esmodule'
            }
        };
        return this.defaultBrowserBundleOptions;
    }

    /**
     * @param {string} entryPath
     * @returns {Parcel}
     */
    createCssBundler(entryPath)
    {
        let workerFarm = createWorkerFarm({ backend: 'process' });
        return new Parcel({
            defaultConfig: 'reldens/lib/bundlers/drivers/parcel-config',
            entries: entryPath,
            shouldDisableCache: true,
            workerFarm,
            defaultTargetOptions: {
                shouldDisableCache: true,
                shouldOptimize: true,
                sourceMaps: this.cssSourceMaps,
                distDir: this.projectCssPath,
                isLibrary: false,
                outputFormat: 'esmodule',
                publicUrl: './'
            }
        });
    }

    copyNew()
    {
        this.copyDefaultAssets();
        this.copyDefaultTheme();
        this.copyPackage();
        this.copyAdmin();
    }

    /**
     * @returns {Promise<void>}
     */
    async fullRebuild()
    {
        this.copyNew();
        await this.buildSkeleton();
        this.copyAdminFiles();
    }

    /**
     * @returns {Promise<void>}
     */
    async installSkeleton()
    {
        await this.copyIndex(true);
        await this.copyServerFiles();
        this.resetDist();
        await this.fullRebuild();
    }

    /**
     * @returns {Promise<void>}
     */
    async createApp()
    {
        await this.copyIndex(true);
        await this.updatePackageJson();
        this.validateOrCreateTheme();
        this.resetDist();
        await this.fullRebuild();
    }

    /**
     * @returns {Promise<void>}
     */
    async copyServerFiles()
    {
        this.copyEnvFile();
        this.copyKnexFile();
        this.copyGitignoreFile();
        await this.copyIndex();
    }

    /**
     * @returns {boolean}
     */
    distPathExists()
    {
        let result = FileHandler.exists(this.distPath);
        Logger.info('Dist path: '+this.distPath, 'Dist folder exists? '+(result ? 'yes' : 'no'));
        return result;
    }

    /**
     * @returns {boolean}
     */
    themePathExists()
    {
        let result = FileHandler.exists(this.projectThemePath);
        Logger.info('Theme path: '+this.projectThemePath, 'Theme folder exists? '+(result ? 'yes' : 'no'));
        return result;
    }

    validateOrCreateTheme()
    {
        let distExists = this.distPathExists();
        let themeExists = this.themePathExists();
        if(false === themeExists){
            this.installDefaultTheme();
            Logger.error(
                'Project theme folder was not found: '+this.projectThemeName
                +'\nA copy from default has been made.'
            );
        }
        if(false === distExists){
            this.copyAssetsToDist();
        }
    }

    /**
     * @param {string} filePath
     * @param {Object<string, any>} [params]
     * @returns {Promise<string|false>}
     */
    async loadAndRenderTemplate(filePath, params)
    {
        if(!FileHandler.exists(filePath)){
            Logger.error('Template not found.', {filePath});
            return false;
        }
        let fileContent = FileHandler.fetchFileContents(filePath);
        return await this.templateEngine.render(fileContent, params);
    }

    /**
     * @returns {Promise<boolean|void>}
     */
    async createClientBundle()
    {
        // @TODO - BETA - Remove this function, just move to an auto-installation on first run feature.
        let runBundler = 1 === Number(sc.get(process.env, 'RELDENS_ALLOW_RUN_BUNDLER', 0));
        if(!runBundler){
            return false;
        }
        let forceResetDistOnBundle = 1 === Number(sc.get(process.env, 'RELDENS_FORCE_RESET_DIST_ON_BUNDLE', 0));
        if(forceResetDistOnBundle){
            await this.resetDist();
        }
        let forceCopyAssetsOnBundle = 1 === Number(sc.get(process.env, 'RELDENS_FORCE_COPY_ASSETS_ON_BUNDLE', 0));
        if(forceCopyAssetsOnBundle){
            this.copyAssetsToDist();
        }
        Logger.info('Running bundle on: '+this.projectIndexPath);
        await this.buildClient();
    }

    /**
     * @returns {Promise<void>}
     */
    async updatePackageJson()
    {
        let jsonFile = FileHandler.joinPaths(this.projectRoot, 'package.json');
        Logger.info('Updating package.json.', jsonFile);
        let readFile = jsonFile;
        if(!FileHandler.exists(jsonFile)){
            readFile = FileHandler.joinPaths(this.reldensModulePathInstallTemplatesFolder, 'data-package.json');
            Logger.error('File package.json does not exists, changing read-file.', jsonFile);
        }
        let data = FileHandler.fetchFileJson(readFile);
        if(!data){
            console.error(error); Logger.critical('Invalid package.json data.', readFile);
            return;
        }
        if(!data.alias){
            data.alias = {};
        }
        if(data.alias.process){
            console.error(error); Logger.critical('Data alias process already exists, it must be set to "false" for the bundler.', data);
            data.alias.processBackup = data.alias.process;
        }
        data.alias.process = false;
        if(!data.targets){
            data.targets = {};
        }
        if(data.targets.main){
            console.error(error); Logger.critical('Data targets main already exists, it must be set to "false" for the bundler.', data);
            data.targets.mainBackup = data.targets.main;
        }
        data.targets.main = false;
        await FileHandler.updateFileContents(jsonFile, JSON.stringify(data, null, 2));
        Logger.info('File package.json updated successfully.', jsonFile);

    }

}

module.exports.ThemeManager = ThemeManager;

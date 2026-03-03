// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
    config.set({
        basePath: '',
        frameworks: ['jasmine', '@angular-devkit/build-angular'],
        plugins: [
            require('karma-jasmine'),
            require('karma-chrome-launcher'),
            require('karma-jasmine-html-reporter'),
            require('karma-junit-reporter'),
            require('karma-coverage'),
            require('karma-spec-reporter'),
            require('@angular-devkit/build-angular/plugins/karma')
        ],
        client: {
            jasmine: {
                // you can add configuration options for Jasmine here
                // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
                // for example, you can disable the random execution with `random: false`
                // or set a specific seed with `seed: 4321`
            },
            clearContext: false // leave Jasmine Spec Runner output visible in browser
        },
        jasmineHtmlReporter: {
            suppressAll: true // removes the duplicated traces
        },
        coverageReporter: {
            dir: require('path').join(__dirname, './coverage/maarch-courrier'),
            subdir: '.',
            reporters: [
                { type: 'cobertura' }
            ]
        },
        reporters: ['progress', 'junit', 'spec'],
        junitReporter: {
            outputDir: require('path').join(__dirname, './coverage/maarch-courrier'),
            outputFile: 'junit-coverage.xml',
            useBrowserName: false
        },
        specReporter: {
            maxLogLines: 5,             // limit number of lines logged per test
            suppressSummary: true,      // do not print summary
            suppressErrorSummary: true, // do not print error summary
            suppressFailed: false,      // do not print information about failed tests
            suppressPassed: false,      // do not print information about passed tests
            suppressSkipped: true,      // do not print information about skipped tests
            showBrowser: false,         // print the browser for each spec
            showSpecTiming: false,      // print the time elapsed for each spec
            failFast: true,             // test would finish with error when a first fail occurs
            prefixes: {
              success: '    OK: ',      // override prefix for passed tests, default is '✓ '
              failure: 'FAILED: ',      // override prefix for failed tests, default is '✗ '
              skipped: 'SKIPPED: '      // override prefix for skipped tests, default is '- '
            }
        },
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: false,
        browsers: ['Chrome', 'ChromeHeadlessCI'],
        customLaunchers: {
            ChromeHeadlessCI: {
                base: 'ChromeHeadless',
                flags: ['--no-sandbox']
            }
        },
        singleRun: false,
        restartOnFileChange: true,
        browserNoActivityTimeout: 60000,
        browserDisconnectTimeout: 60000
    });
};

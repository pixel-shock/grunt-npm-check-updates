'use strict';

const _ = require('lodash');
const fs = require('fs');
const chalk = require('chalk');
const semver = require('semver');
const merge = require('deepmerge');
const exec = require('child_process').execSync;
const columnify = require('columnify');
const ProgressBar = require('progress');
const XMLWriter = require('xml-writer');

module.exports = (grunt) => {
    /* eslint-disable */
    grunt.registerTask('grunt-npm-check-updates', 'A Grunt Task that checks the update capabilities for each installed modules (without their dependencies).', function() {
    /* eslint-enable */
        const done = this.async();
        const isDebug = grunt.cli.options.debug === 1 || false;

        const defaults = {
            include: {
                production: true,
                develop: true,
                optional: false,
                jsonFile: 'package.json',
            },
            output: {
                visual: true,
                xml: true,
                xmlFilename: 'grunt-npm-check-updates.xml',
            },
            global: {
                missedMajors: {
                    allowed: 0,
                    level: 'error',
                },
                missedMinors: {
                    allowed: 1,
                    level: 'warn',
                },
                missedPatches: {
                    allowed: 0,
                    level: 'warn',
                },
                showVersions: false,
            },
            modules: {},
        };

        const options = merge(defaults, this.options());

        const compareVersion = (moduleName, installedVersion, latestVersion, versions) => {
            try {
                const installedVersionIndex = _.indexOf(versions, installedVersion);
                const latestVersionIndex = _.indexOf(versions, latestVersion);
                let missedMajors = 0;
                let missedMinors = 0;
                let missedPatches = 0;
                let lastMajor = -1;
                let lastMinor = -1;

                if (installedVersionIndex !== -1 && latestVersionIndex !== -1) {
                    for (let i = installedVersionIndex; i <= latestVersionIndex; i += 1) {
                        const validAvailable = semver.valid(versions[i]);
                        const validInstalled = semver.valid(installedVersion);
                        const isStableRelease = /^[0-9.]+$/.test(validInstalled);

                        if (validInstalled !== null && validAvailable !== null && isStableRelease) {
                            const majorInstalled = semver.major(validInstalled);
                            const minorInstalled = semver.minor(validInstalled);
                            const patchInstalled = semver.patch(validInstalled);
                            const majorAvailable = semver.major(validAvailable);
                            const minorAvailable = semver.minor(validAvailable);
                            const patchAvailable = semver.patch(validAvailable);

                            if (majorInstalled === majorAvailable
                                && minorInstalled === minorAvailable
                                && patchInstalled !== patchAvailable) {
                                missedPatches += 1;
                            }

                            if (majorInstalled === majorAvailable
                                && minorInstalled !== minorAvailable
                                && lastMinor !== minorAvailable) {
                                missedMinors += 1;
                                lastMinor = minorAvailable;
                            }

                            if (majorInstalled < majorAvailable
                                && lastMajor !== majorAvailable) {
                                missedMajors += 1;
                                lastMajor = majorAvailable;
                            }
                        }
                    }

                    return {
                        moduleName,
                        installedVersion,
                        latestVersion,
                        missedMajors,
                        missedMinors,
                        missedPatches,
                        versions,
                    };
                }
                grunt.fail.fatal(`Could not find current installed version within npm version history for module ${moduleName}`);
            } catch (e) {
                grunt.fail.fatal(e);
            }

            return {};
        };

        const prettifyVersions = (versions, installedVersion) => {
            let ret = '';
            _.each(versions, (version, key) => {
                let v = version;
                if (v === installedVersion || key === versions.length - 1) {
                    v = chalk.underline(v);
                }
                if (key < versions.length - 2) {
                    ret += `\u251C ${v}\n`;
                } else {
                    ret += `\u2514 ${v}\n`;
                }
            });

            return ret;
        };

        const getModules = () => {
            const pgkJsonFile = options.include.jsonFile;

            if (grunt.file.isFile(pgkJsonFile)) {
                try {
                    const fileContent = fs.readFileSync(pgkJsonFile, 'utf8');
                    try {
                        return JSON.parse(fileContent);
                    } catch (err) {
                        grunt.fail.fatal(err);
                    }
                } catch (err) {
                    grunt.fail.fatal(err);
                }
            } else {
                grunt.log.writeln(chalk.red('Could not read package.json. File don\'t exist!'));
            }

            return {};
        };

        const getInstalledVersion = (moduleName) => {
            // NOTE: As npm view do not return a valid JSON we can't use this with JSON parse to
            // get the whole module information due to a JSON.parse error
            const regExInstalledVersion = new RegExp(`${moduleName}\\@(\\d+\\.\\d+\\.\\d+)`, 'igm');
            const cmdInstalledVersion = `npm list --depth=0 ${moduleName}`;
            let cmdInstalledVersionResult = '';
            let matchesInstalledVersion = null;

            try {
                cmdInstalledVersionResult = exec(cmdInstalledVersion, { encoding: 'UTF-8' }).replace(/\r?\n?/g, '');
                matchesInstalledVersion = regExInstalledVersion.exec(cmdInstalledVersionResult);
            } catch (err) {
                grunt.log.warn(err);
            }

            let cmdModuleVerionsResult = '';
            let versions = [];

            try {
                cmdModuleVerionsResult = exec(`npm view ${moduleName} versions`, { encoding: 'UTF-8' });
                versions = cmdModuleVerionsResult.replace(/(?:\r\n|\r|\n|\s?)/g, '').replace(/\[?\]?/ig, '').replace(/'/g, '').split(',');
            } catch (err) {
                grunt.log.warn(err);
            }

            let cmdDistTagsResult = '';
            const regExLatest = new RegExp('(latest:\\s?\'|")(\\d+\\.\\d+\\.\\d+)(\'|")', 'ig');
            let matchesLatest = null;

            try {
                cmdDistTagsResult = exec(`npm view ${moduleName} dist-tags`, { encoding: 'UTF-8' });
                const distTags = cmdDistTagsResult.replace(/\r?\n?/g, '');
                matchesLatest = regExLatest.exec(distTags);
            } catch (err) {
                grunt.log.warn(err);
            }

            if (matchesInstalledVersion !== null
                && matchesInstalledVersion.length === 2
                && matchesLatest !== null
                && matchesLatest.length === 4) {
                return {
                    moduleName,
                    installed: matchesInstalledVersion[1],
                    latest: matchesLatest[2],
                    versions,
                };
            }

            return false;
        };

        const getModuleDatas = () => {
            const modules = getModules();
            const result = [];
            const prodModules = (options.include.production && modules.dependencies) || {};
            const devModules = (options.include.develop && modules.devDependencies) || {};
            const optModules = (options.include.optional && modules.optionalDependencies) || {};
            let modulesToTest = merge({}, prodModules);
            modulesToTest = merge(modulesToTest, devModules);
            modulesToTest = merge(modulesToTest, optModules);

            const progressBar = new ProgressBar('Checking update states for module :current/:total [:bar] :percent :elapseds :etas', {
                total: _.size(modulesToTest),
                width: 80,
            });


            _.each(modulesToTest, (version, name) => {
                const data = getInstalledVersion(name);

                if (data !== false) {
                    result.push(data);
                }

                progressBar.tick();
            });

            return result;
        };

        const init = () => {
            const modules = getModuleDatas();
            const columns = [];
            const xmlWriter = new XMLWriter();
            let overAllStatusErrors = 0;

            xmlWriter.startDocument();
            xmlWriter.startElement('modules');

            _.each(modules, (data) => {
                let majorErrorCount = 0;
                let minorErrorCount = 0;
                let patchErrorCount = 0;
                const columnData = {
                    name: data.moduleName,
                    installed: data.installed,
                    latest: data.latest,
                };
                const result = compareVersion(
                    data.moduleName,
                    data.installed,
                    data.latest,
                    data.versions);
                const moduleOptions = options.modules[result.moduleName] || options.global;

                xmlWriter.startElement('module');
                xmlWriter.writeAttribute('name', data.moduleName);
                xmlWriter.writeAttribute('installed', data.installed);
                xmlWriter.writeAttribute('latest', data.latest);
                xmlWriter.writeAttribute('missedMajors', result.missedMajors);
                xmlWriter.writeAttribute('missedMinors', result.missedMinors);
                xmlWriter.writeAttribute('missedPatches', result.missedPatches);

                if (moduleOptions.missedMajors.allowed !== true
                    && result.missedMajors > moduleOptions.missedMajors.allowed) {
                    switch (moduleOptions.missedMajors.level) {
                    case 'warn':
                        columnData.major = chalk.yellow(`[WARNING] Missed ${result.missedMajors}`);
                        break;
                    case 'error':
                        columnData.major = chalk.red(`[ERROR] Missed ${result.missedMajors}`);
                        majorErrorCount += 1;
                        break;
                    default:
                        if (isDebug) {
                            columnData.major = `[DEBUG] Missed ${result.missedMajors}`;
                        } else {
                            columnData.major = chalk.green('\u2714');
                        }
                        break;
                    }
                } else {
                    columnData.major = chalk.green('\u2714');
                }

                if (moduleOptions.missedMinors.allowed !== true
                    && result.missedMinors > moduleOptions.missedMinors.allowed) {
                    switch (moduleOptions.missedMinors.level) {
                    case 'warn':
                        columnData.minor = chalk.yellow(`[WARNING] Missed ${result.missedMinors}`);
                        break;
                    case 'error':
                        columnData.minor = chalk.red(`[ERROR] Missed ${result.missedMinors}`);
                        minorErrorCount += 1;
                        break;
                    default:
                        if (isDebug) {
                            columnData.minor = `[DEBUG] Missed ${result.missedMinors}`;
                        } else {
                            columnData.minor = chalk.green('\u2714');
                        }
                        break;
                    }
                } else {
                    columnData.minor = chalk.green('\u2714');
                }

                if (moduleOptions.missedPatches.allowed !== true
                    && result.missedPatches > moduleOptions.missedPatches.allowed) {
                    switch (moduleOptions.missedPatches.level) {
                    case 'warn':
                        columnData.patch = chalk.yellow(`[WARNING] Missed ${result.missedPatches}`);
                        break;
                    case 'error':
                        columnData.patch = chalk.red(`[ERROR] Missed ${result.missedPatches}`);
                        patchErrorCount += 1;
                        break;
                    default:
                        if (isDebug) {
                            columnData.patch = `[DEBUG] Missed ${result.missedPatches}`;
                        } else {
                            columnData.patch = chalk.green('\u2714');
                        }
                        break;
                    }
                } else {
                    columnData.patch = chalk.green('\u2714');
                }

                if (moduleOptions.showVersions === true) {
                    columnData.versions = prettifyVersions(
                        result.versions,
                        result.installedVersion);

                    xmlWriter.startElement('versions');
                    xmlWriter.text(data.versions.join(','));
                    xmlWriter.endElement();
                } else {
                    columnData.versions = chalk.italic('n.a.');
                }

                if (majorErrorCount + minorErrorCount + patchErrorCount === 0) {
                    columnData['overall status'] = chalk.green('\u2714');
                    xmlWriter.writeAttribute('status', 'success');
                } else {
                    columnData['overall status'] = chalk.red('\u2718');
                    xmlWriter.writeAttribute('status', 'fail');
                    overAllStatusErrors += 1;
                }

                columns.push(columnData);

                xmlWriter.endElement();
            });


            if (options.output.visual === true || overAllStatusErrors > 0) {
                grunt.log.writeln('');

                grunt.log.writeln(columnify(columns, {
                    preserveNewLines: true,
                    showHeaders: true,
                    columnSplitter: '  \u2503  ',
                    headingTransform(heading) {
                        const head = chalk.underline(heading[0].toUpperCase() + heading.slice(1));
                        return heading && head;
                    },
                }));

                grunt.log.writeln('');
            }

            xmlWriter.endElement();
            xmlWriter.endDocument();

            if (options.output.xml === true) {
                try {
                    fs.writeFileSync(options.output.xmlFilename, xmlWriter.toString());
                } catch (err) {
                    grunt.log.writeln(`Could not write XML output to file: ${chalk.yellow(err)}`);
                }
            }

            if (overAllStatusErrors > 0) {
                grunt.fail.fatal(`Grunt Task failed, because of ${overAllStatusErrors} error(s)!`);
            }

            done();
        };

        init();
    });
};

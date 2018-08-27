'use strict';

const _ = require('lodash');
const fs = require('fs');
const chalk = require('chalk');
const deepmerge = require('deepmerge');
const columnify = require('columnify');

const Comparator = require('./lib/Comparator.js');
const Helper = require('./lib/Helper.js');
const Handlebars = require('handlebars');

module.exports = (grunt) => {
    /* eslint-disable */
    grunt.registerTask('grunt-npm-check-updates', 'A Grunt Task that checks the update capabilities for each installed modules (without their dependencies).', function() {
    /* eslint-enable */
        const done = this.async();
        const isDebug = grunt.cli.options.debug === 1 || false;

        let defaults = {
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
                xmlTemplate: '<?xml version="1.0"?><modules>{{#each modules}}<module name="{{{ this.name }}}" installed="{{{ this.installed }}}" latest="{{{ this.latest }}}" missedMajors="{{{ this.missedMajors }}}" missedMinors="{{{ this.missedMinors }}}" missedPatches="{{{ this.missedPatches }}}" status="{{{ this.status }}}"><versions>{{{ this.versions }}}</versions></module>{{/each}}</modules>',
                json: true,
                jsonFilename: 'grunt-npm-check-updates.json',
                jsonTemplate: '{"modules": [{{#each modules}}{{#if @last }}{"name": "{{{ this.name }}}","installed": "{{{ this.installed }}}","latest": "{{{ this.latest }}}","missedMajors": "{{{ this.missedMajors }}}","missedMinors": "{{{ this.missedMinors }}}","missedPatches": "{{{ this.missedPatches }}}","versions": "{{{ this.versions }}}","status": "{{{ this.status }}}"}{{else}}{"name": "{{{ this.name }}}","installed": "{{{ this.installed }}}","latest": "{{{ this.latest }}}","missedMajors": "{{{ this.missedMajors }}}","missedMinors": "{{{ this.missedMinors }}}","missedPatches": "{{{ this.missedPatches }}}","versions": "{{{ this.versions }}}","status": "{{{ this.status }}}"},{{/if}}{{/each}}]}',
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

        const options = deepmerge.all([{}, defaults, this.options()]);

        const init = () => {
            const comparator = new Comparator();
            const helper = new Helper();
            const modules = helper.getModuleDatas(options);
            let columns = [];
            let overAllStatusErrors = 0;
            let outputModules = [];

            _.each(modules, (data) => {
                let majorErrorCount = 0;
                let minorErrorCount = 0;
                let patchErrorCount = 0;
                let columnData = {
                    name: data.moduleName,
                    installed: data.installed,
                    latest: data.latest,
                };
                let result = comparator.compare(
                    data.moduleName,
                    data.installed,
                    data.latest,
                    data.versions);
                let moduleOptions = options.modules[result.moduleName] || options.global;

                let outputModule = {
                    name: result.moduleName,
                    installed: result.installed,
                    latest: result.latestVersion,
                    missedMajors: result.missedMajors,
                    missedMinors: result.missedMinors,
                    missedPatches: result.missedPatches,
                    versions: result.versions,
                };

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
                    columnData.versions = helper.prettifyVersions(
                        result.versions,
                        result.installedVersion);
                } else {
                    columnData.versions = chalk.italic('n.a.');
                }

                if (majorErrorCount + minorErrorCount + patchErrorCount === 0) {
                    columnData['overall status'] = chalk.green('\u2714');
                    outputModule.status = 'success';
                } else {
                    columnData['overall status'] = chalk.red('\u2718');
                    outputModule.status = 'fail';
                    overAllStatusErrors += 1;
                }

                columns.push(columnData);
                outputModules.push(outputModule);
            });


            if (options.output.visual === true || overAllStatusErrors > 0) {
                grunt.log.writeln('');
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

            if (options.output.xml === true) {
                try {
                    const hbTemplate = Handlebars.compile(options.output.xmlTemplate);
                    const xmlOutput = hbTemplate({
                        modules: outputModules,
                    });

                    fs.writeFileSync(options.output.xmlFilename, xmlOutput, 'utf8');
                } catch (err) {
                    grunt.log.writeln(`Could not write XML output to file: ${chalk.yellow(err)}`);
                }
            }

            if (options.output.json === true) {
                try {
                    const hbTemplate = Handlebars.compile(options.output.jsonTemplate);
                    const jsonOutput = hbTemplate({
                        modules: outputModules,
                    });

                    fs.writeFileSync(options.output.jsonFilename, jsonOutput, 'utf8');
                } catch (err) {
                    grunt.log.writeln(`Could not write JSON output to file: ${chalk.yellow(err)}`);
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

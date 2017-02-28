'use strict';

const _ = require('lodash');
const fs = require('fs');
const chalk = require('chalk');
const merge = require('deepmerge');
const grunt = require('grunt');
const exec = require('child_process').execSync;
const ProgressBar = require('progress');

function Helper() {
    if (!(this instanceof Helper)) {
        return new Helper();
    }
}

Helper.prototype = {
    prettifyVersions: (versions, installedVersion) => {
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
    },
    getModules: (options) => {
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
    },
    getInstalledVersion: (moduleName) => {
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
    },
    getModuleDatas: (options) => {
        const modules = Helper().getModules(options);
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
            const data = Helper().getInstalledVersion(name);

            if (data !== false) {
                result.push(data);
            }

            progressBar.tick();
        });

        return result;
    },
};

module.exports = Helper;

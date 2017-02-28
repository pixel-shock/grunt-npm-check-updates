'use strict';

const _ = require('lodash');
const grunt = require('grunt');
const semver = require('semver');

function Comperator() {
    if (!(this instanceof Comperator)) {
        return new Comperator();
    }
}

Comperator.prototype = {
    compare: (moduleName, installedVersion, latestVersion, versions) => {
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
    },
};

module.exports = Comperator;

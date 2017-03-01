'use strict';

const _ = require('lodash');
const semver = require('semver');

function Comperator() {
    if (!(this instanceof Comperator)) {
        return new Comperator();
    }
}

Comperator.prototype = {
    compare: (moduleName, installedVersion, latestVersion, versions) => {
        /* eslint-disable */
        let result = {
            moduleName: moduleName,
            installedVersion: installedVersion,
            latestVersion: latestVersion,
            missedMajors: 0,
            missedMinors: 0,
            missedPatches: 0,
            versions: versions,
        };
        /* eslint-enable */
        const installedVersionIndex = _.indexOf(versions, installedVersion);
        const latestVersionIndex = _.indexOf(versions, latestVersion);
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
                        result.missedPatches += 1;
                    }

                    if (majorInstalled === majorAvailable
                        && minorInstalled !== minorAvailable
                        && lastMinor !== minorAvailable) {
                        result.missedMinors += 1;
                        lastMinor = minorAvailable;
                    }

                    if (majorInstalled < majorAvailable
                        && lastMajor !== majorAvailable) {
                        result.missedMajors += 1;
                        lastMajor = majorAvailable;
                    }
                }
            }
        }

        return result;
    },
};

module.exports = Comperator;

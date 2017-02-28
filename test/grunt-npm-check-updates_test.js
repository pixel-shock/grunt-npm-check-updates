'use strict';

const Comparator = require('../tasks/Comparator.js');

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

exports.tests = {
    setUp: (done) => {
        done();
    },
    missedMajors: (test) => {
        const DUMMY_VERSIONS = [
            '0.1.0',
            '1.0.0',
            '2.0.0',
        ];
        const result = Comparator().compare('dummyModule', '1.0.0', '2.0.0', DUMMY_VERSIONS);

        test.equal(result.moduleName, 'dummyModule');
        test.equal(result.installedVersion, '1.0.0');
        test.equal(result.latestVersion, '2.0.0');
        test.equal(result.missedMajors, 1);
        test.equal(result.missedMinors, 0);
        test.equal(result.missedPatches, 0);
        test.equal(result.versions, DUMMY_VERSIONS);

        test.done();
    },
    missedMinors: (test) => {
        const DUMMY_VERSIONS = [
            '0.1.0',
            '1.0.0',
            '1.1.0',
            '1.2.0',
            '1.3.0',
            '1.4.0',
            '1.5.0',
            '1.6.0',
            '1.7.0',
            '1.8.0',
        ];
        const result = Comparator().compare('dummyModule', '1.0.0', '1.8.0', DUMMY_VERSIONS);

        test.equal(result.moduleName, 'dummyModule');
        test.equal(result.installedVersion, '1.0.0');
        test.equal(result.latestVersion, '1.8.0');
        test.equal(result.missedMajors, 0);
        test.equal(result.missedMinors, 8);
        test.equal(result.missedPatches, 0);
        test.equal(result.versions, DUMMY_VERSIONS);

        test.done();
    },
    missedPatches: (test) => {
        const DUMMY_VERSIONS = [
            '1.0.0',
            '1.0.1',
            '1.0.2',
            '1.0.3',
            '1.0.4',
            '1.0.5',
            '1.0.6',
        ];
        const result = Comparator().compare('dummyModule', '1.0.0', '1.0.6', DUMMY_VERSIONS);

        test.equal(result.moduleName, 'dummyModule');
        test.equal(result.installedVersion, '1.0.0');
        test.equal(result.latestVersion, '1.0.6');
        test.equal(result.missedMajors, 0);
        test.equal(result.missedMinors, 0);
        test.equal(result.missedPatches, 6);
        test.equal(result.versions, DUMMY_VERSIONS);

        test.done();
    },
    missedAll: (test) => {
        const DUMMY_VERSIONS = [
            '1.0.0',
            '1.1.0',
            '1.2.0',
            '1.3.0',
            '1.4.0',
            '1.5.0',
            '1.6.0',
            '1.7.0',
            '1.7.1',
            '1.7.2',
            '2.8.0',
            '2.8.1',
            '2.8.2',
            '2.8.3',
            '2.8.4',
            '2.8.5',
            '2.8.6',
        ];
        const result = Comparator().compare('dummyModule', '1.0.0', '2.8.6', DUMMY_VERSIONS);

        test.equal(result.moduleName, 'dummyModule');
        test.equal(result.installedVersion, '1.0.0');
        test.equal(result.latestVersion, '2.8.6');
        test.equal(result.missedMajors, 1);
        test.equal(result.missedMinors, 7);
        test.equal(result.missedPatches, 0);
        test.equal(result.versions, DUMMY_VERSIONS);

        test.done();
    },
};

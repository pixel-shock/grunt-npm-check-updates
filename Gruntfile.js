'use strict';

module.exports = (grunt) => {
    grunt.initConfig({
        eslint: {
            options: {
                configFile: '.eslintrc.json',
            },
            target: [
                'Gruntfile.js',
                './test/**/*.js',
                './tasks/**/*.js',
            ],
        },
        nodeunit: {
            tests: [
                'test/*_test.js',
            ],
        },
        'grunt-npm-check-updates': {
            options: {
                output: {
                    json: false
                }
            }
        }
    });

    // Actually load this plugin's task(s).
    grunt.loadTasks('tasks');
    grunt.loadNpmTasks('grunt-eslint');
    grunt.loadNpmTasks('grunt-contrib-nodeunit');

    grunt.registerTask('test', ['eslint', 'nodeunit']);
    grunt.registerTask('default', ['grunt-npm-check-updates']);
};

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
    });

    // Actually load this plugin's task(s).
    grunt.loadTasks('tasks');
    grunt.loadNpmTasks('grunt-eslint');

    grunt.registerTask('test', ['eslint']);
    grunt.registerTask('default', ['grunt-npm-check-updates']);
};

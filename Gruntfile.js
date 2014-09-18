module.exports = function(grunt) {
    // load up all of the necessary grunt plugins
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-express-server');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-casperjs');
    grunt.loadNpmTasks('grunt-mocha');
    grunt.loadNpmTasks('grunt-notify');

    // in what order should the files be concatenated
    var clientIncludeOrder = require('./test/include.conf.js');

    // grunt setup
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        // what files should be linted
        jshint: {
            gruntfile: 'Gruntfile.js',
            client: clientIncludeOrder,
            unit: 'test/unit/*',
            options: {
                globals: {
                    eqeqeq: true
                }
            }
        },

        // configure karma
        karma: {
            options: {
                configFile: 'karma.conf.js',
                reporters: ['progress', 'coverage']
            },
            // Single-run configuration for development
            single: {
                singleRun: true,
            }
        },

        // configure casperjs
        casperjs: {
            options: {},
            e2e: {
                files: {
                    'results/casper': 'test/e2e/*.js'
                }
            }
        },

        // create a watch task for tracking
        // any changes to the following files
        watch: {
            client: {
                files: clientIncludeOrder,
                tasks: 'test'
            },
            gruntfile: {
                files: 'Gruntfile.js',
                tasks: 'jshint:gruntfile'
            },
            unitTests: {
                files: ['test/unit/*.js'],
                tasks: 'test'
            },
            integrationTests: {
                files: ['test/integration/*.js'],
                tasks: ['test']
            },
            e2eTests: {
                files: ['test/e2e/*.js'],
                tasks: ['casperjs']
            },


        }

    });

    // Start watching and run tests when files change
    grunt.registerTask('default', ['lint', 'test', 'watch']);
    grunt.registerTask('lint', ['jshint']);
    grunt.registerTask('test', ['lint', 'karma:single']);

};

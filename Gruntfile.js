module.exports = function(grunt) {

  const JS_DEPS = [
    'node_modules/jquery/dist/jquery.min.js',
    'node_modules/materialize-css/dist/js/materialize.min.js',
    'node_modules/material-design-icons/iconfont/material-icons.js',
    'node_modules/datatables/media/js/jquery.dataTables.min.js',
    'public/js/dataTables.material.js',
    'node_modules/moment/min/moment-with-locales.min.js',
    'node_modules/moment-duration-format/lib/moment-duration-format.js'
  ];

  const CSS_DEPS = [
    'node_modules/materialize-css/dist/css/materialize.min.css',
    'public/css/datatables.min.css',
    'node_modules/material-design-icons/iconfont/material-icons.css',
  ];
  
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    copy: {
      package: {
        files: [
          // includes files within path and its sub-directories
          {expand: true, src: ['config/**', 'src/**', 'batchs/**', 'public'], dest: 'build/'},
          {expand: true, src: ['*.js', '*.json', '*.txt', '*.md', '*.sh', "*.yml", 'straw-manager', 'LICENCE', '.bowerrc'], dest: 'build'},
        ],
      },
      serve: {
        files: [
          { 
            expand: true,
            flatten: true,
            src: [ 'material-design-icons/iconfont/*', "!**/*.js", "!**/*.css", "!**/*.md", "!**/codepoints" ],
            dest: 'public/',
            cwd: './node_modules'
          },
          { 
            expand: true,
            flatten: true,
            src: [ 'roboto-npm-webfont/full/**', "!**/*.js", "!**/*.css", "!**/*.md", "!**/*.json" ],
            dest: 'public/fonts/roboto',
            cwd: './node_modules'
          }
        ]
      }
    },
    compress: {
      main: {
        options: {
          archive: 'dist/<%= pkg.name %>-<%= pkg.version %>.zip'
        },
        files: [{
          expand: true,
          cwd: 'build/',
          src: ['**', '.*'],
          dest: '/<%= pkg.name %>-<%= pkg.version %>'
        }]
      }
    },
    clean: ['build/'],
    // Project configuration.
    concat: {
      app: {
        files: {
          'public/app.min.js' : JS_DEPS,
          'public/app.min.css': CSS_DEPS
        }
      },
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-concat');

  grunt.registerTask('dist', ['clean', 'copy:package', 'compress']);
  grunt.registerTask('default', ['concat', 'copy:serve'])
};

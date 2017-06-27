module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    copy: {
      main: {
        files: [
          // includes files within path and its sub-directories
          {expand: true, src: ['src/**', 'batchs/**', 'public'], dest: 'build/'},
          {expand: true, src: ['*.js', '*.json', '*.txt', '*.md', '*.sh', "*.yml", 'CollectOnline', 'LICENCE', '.bowerrc'], dest: 'build'},
        ],
      },
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
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.registerTask('default', ['clean', 'copy', 'compress']);
};

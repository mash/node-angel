module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: []
  });
  grunt.loadNpmTasks('grunt-release'); // dry run: grunt --no-write -v release

  grunt.registerTask('default', ['test']);

  grunt.registerTask('test', 'run tests', function() {
    var done = this.async(),
      numberOfTests = 3;

    require('child_process').exec(
      'npm test',
      function(error, stdout, stderr) {
        grunt.log.verbose.writeln(stdout);
        grunt.log.verbose.writeln(stderr);
        if (error) {
          grunt.log.error(error);
          done(false);
          return;
        }
        done(true);
      }
    );
  });
};

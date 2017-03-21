module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
	requirejs: {
		compile: {
			options: {
				almond: true,
				baseUrl: "assets/js/",				
				mainConfigFile: "assets/js/require_main.js",
				name: "vendor/almond", // assumes a production build using almond 
				out: "build/compiled.js",
				wrapShim: true,
				include: "require_main.js",
				findNestedDependencies: true
			}
		}
	}
  });

  // Load the plugins that provides the tasks.
  grunt.loadNpmTasks('grunt-contrib-requirejs');

  // Default task(s).
  grunt.registerTask('default', ['requirejs']);
  
  

};
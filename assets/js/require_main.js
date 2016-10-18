//require_main.js
requirejs.config({
  waitSeconds: 200,
  //this is HUGE, man.  you need the preceeding slash for the router to work
  //fucking HUGE hours and hours and hours of headpounding, dude!!
  baseUrl: "/assets/js",
  paths: {
    backbone: "vendor/backbone",
    jquery: "vendor/jquery",
    json2: "vendor/json2",
    text: "vendor/text",
    tpl: "vendor/underscore-tpl",
    underscore: "vendor/underscore",
    leaflet: "vendor/leaflet-0.7.7/leaflet-src",
    'leaflet.draw': "vendor/leaflet-draw/leaflet.draw-src",    
    bootstrap: "vendor/bootstrap/dist/js/bootstrap.min"
  },
  shim: {
    bootstrap: {
        deps: ["jquery"]
    },
    underscore: {
      exports: "_"
    },
    backbone: {
      deps: ["jquery", "underscore", "json2"],
      exports: "Backbone"
    },
    tpl: {
        deps: ["text"]
    },
    leaflet: {
        exports : "L"
    },
    'leaflet.draw': ["leaflet"]
  }
});
require(["app"], function(app){
  app.start();
});

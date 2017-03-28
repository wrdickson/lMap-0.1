//router
define ([
    'backbone',
    'common/dispatch',
    'apps/pageLoader/pageLoader',
	'apps/mapApp/mapApp',
	'apps/layerApp/layerApp',
], function (
    Backbone,
    dispatch,
    pageLoader,
	mapApp,
	layerApp
) {
    'use strict'
	
    var Router = Backbone.Router.extend({
        
        routes: {
			''						:	'cleanUrl',
            'index.php'             :   'cleanUrl',
            'home'                  :   'home',
            'content/:id'           :   'loadPage',
			'maps/:id'				:	'loadMap',
			'layers/:id'			:	'loadLayer',
            //make sure this one is last
            //it will default if no route is found
            '*path'                 :  'error404' 
        },

        error404: function () {
			$("#contentMain").html("<h4>Page not found</h4>");            
        },
        home: function () {
            this.resetNavbar("home");
            $("#contentMain").html("<p>home</p>");
        },
        initialize: function () {
            console.log("router initializes");
            //initialize pageLoader
            pageLoader.initialize();
        },
		loadLayer: function (id) {
			layerApp.initialize();
			layerApp.loadLayer(id);
		},			
		loadMap: function (id) {
			mapApp.initialize();
			mapApp.loadMap(id);
		},		
        loadPage: function (id) {
            this.resetNavbar(id);
            //$("#contentMain").html("page " + id);
            pageLoader.loadPage(id);
        },
        resetNavbar: function (id) {
            //note: this will have to be configured for the styling of the navbar
            //  this is for navbar-inverse
            //clear all :active or what the fuck ever from the navbar a elements
            $("#myNavbar a").not(".dropdown").css("color", "#9d9d9d");
            //set this one as active but don't mess with the dropdowns
            $("#" + id).not(".dropdown").css("color", "#fff");            
        },
		cleanUrl: function () {
			console.log("cleanUrl");
			this.navigate("content/home", {
                trigger: true
            });
		}
    });
    return Router;
});
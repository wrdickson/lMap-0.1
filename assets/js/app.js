//app.js
define([
    'common/dispatch',
	'router/router',
    'apps/userApp/userApp',
    'vendor/spin',
	'backbone',
	'bootstrap',
	'jquery'
], function (
    dispatch,
	Router,
    UserApp,
    Spinner,
	Backbone
) {
	'use strict';
  
    var app;
	var router;
    var spinner;
	app = {
		initializeSpinner: function() {
			var opts = {
			  lines: 13 // The number of lines to draw
			, length: 0 // The length of each line
			, width: 14 // The line thickness
			, radius: 50 // The radius of the inner circle
			, scale: 1 // Scales overall size of the spinner
			, corners: 1 // Corner roundness (0..1)
			, color: '#000' // #rgb or #rrggbb or array of colors
			, opacity: 0 // Opacity of the lines
			, rotate: 0 // The rotation offset
			, direction: 1 // 1: clockwise, -1: counterclockwise
			, speed: 1 // Rounds per second
			, trail: 29 // Afterglow percentage
			, fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
			, zIndex: 2e9 // The z-index (defaults to 2000000000)
			, className: 'spinner' // The CSS class to assign to the spinner
			, top: '50%' // Top position relative to parent
			, left: '50%' // Left position relative to parent
			, shadow: false // Whether to render a shadow
			, hwaccel: false // Whether to use hardware acceleration
			, position: 'absolute' // Element positioning
			}
			var target = document.getElementById('spinner');
			spinner = new Spinner(opts).spin(target);
            //hide it to start
            $("#spinner").css("display", "none");
		},
        popupMessage: function (message, sender) {
            console.log("ppm fires", message, sender);
            $(sender).addClass("disabled");
            $("#pPanelText").html(message);
            $(".popupPanel").css("display", "block");
                var animationName = "animated zoomInDown";
                var animationEnd = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';
                $('.popupPanel').addClass(animationName).one(animationEnd, function () {
                    $(this).removeClass(animationName);
                    setTimeout(function(){
                        console.log("anim2");
                        var animationName2 = "animated bounceOutRight";
                        $('.popupPanel').addClass(animationName2).one(animationEnd, function () {
                            $(this).css("display", "none");
                            $(this).removeClass(animationName2);
                            $(sender).removeClass("disabled");
                        });                   
                    }, 800);
                });            
        },
		spinOff: function () {
			$("#spinner").css("display", "none");
		},
		spinOn: function () {
			$("#spinner").css("display", "block");
		},        
		start: function () {
            var self = this;
			console.log("app starts");
            
			//initialize the spinner
			this.initializeSpinner();
            
            //base url was passed as a global from index.php
            dispatch.setHandler("getBaseUrl", function () {
                return baseUrl;
            });
            
            //handle user state
            //this has to happen after the getBaseUrl event handle has been set
            //but BEFORE the router . . . in order to handle reefreshes etc
            UserApp.initialize();   

            router = new Router();
            //initialize history AFTER instantion of router(s)
            Backbone.history.start({
                pushState: true
            });	            
			
			//stop a links in nav bar from reloading page
			$("#myNavbar  a").on("click", function(e) {
				e.preventDefault();
			});
			
			//make the navbar collapse after a click, since this is a single page app and won't be refreshing
			$('.navbar-collapse a:not(.dropdown-toggle)').click(function(){
				$(this).parents('.navbar-collapse').collapse('hide');
			});
            
            //handle navigation.  except the dropdown-toggle anchors
            $(".topNav a").not(".dropdown-toggle").on("click", function (e) {
                router.navigate("/content/" + e.target.id, {
                    trigger: true
                });
            });
            
            //set events for loading spinner
            dispatch.on("app:spinOn", function() {
                self.spinOn();
            });
            dispatch.on("app:spinOff", function() {
                self.spinOff();
            });
            dispatch.on("app:popupMessage", function (message, sender) {
                self.popupMessage(message,sender);
            });
            
		}
	};

	return app;
});


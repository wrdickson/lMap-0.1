define ([
    'common/dispatch',
	'router/router',
    'apps/mapApp/data/data',
    'text!apps/mapApp/templates/lMapControl.tpl',
    'tpl!apps/mapApp/templates/popupTemplate.tpl',
    'tpl!apps/mapApp/templates/layersDropdown.tpl',
    'tpl!apps/mapApp/templates/featuresDropdown.tpl',
    'tpl!apps/mapApp/templates/featureDetailModal.tpl',
	'tpl!apps/mapApp/templates/myMapsModal.tpl',
    'backbone',
	'bootstrap',
    'leaflet',    
	'leaflet-vector-markers'
], function (
    dispatch,
	Router,
    data,
    lMapControl,
    popupTemplate,
    layersDropdown,
    featuresDropdown,
    featureDetailModal,
	myMapsModal,
    Backbone,
	Bootstrap,
    L
) {
    'use strict';
    var mapApp = {
        //data is the data function object, loaded at initialize()
        data: {},
        //user is a Backbone Model, loaded at initialize();
        user: {},
        //map is the actual Leaflet map object
        map: {},
        //mapData is a copy of the json object returned from db
        mapData: {},
        //overlays is an array of Leaflet layers, populated as the map renders in renderMapFromData()
        overlays: [],
		//hidden layers are triggered by users
		hiddenLayers: [],
        selectedLayer: undefined,
        selectedFeatureArrayPos: undefined,
        center: undefined, //the map center, updated when user moves or zooms
        zoom: undefined, //int zoom
        bounds: undefined, //
        
		applyTileLayer: function ( layerName ) {
			var self = this;
			switch (layerName) {
				case "topo":
					L.tileLayer('http://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}.jpg', 
						{attribution: 'attributes here'
					}).addTo(self.map);				
				break;
				case "osm":
					L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
						attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
					}).addTo(self.map);				
				break;
				case "sat":
					L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
						attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
					}).addTo(self.map);			
				break;
			}
		},
        fireFeatureDetailModal: function(layerId, arrayPosition) {
            var self = this;
            //clean out the dialog div
            $("#modal").html('');
            //TODO $.unbind() from children of div #modal
            //create a param object for the template
            var templateParamObj = {
                featureName: self.mapData.layersData[layerId].geoJson.features[arrayPosition].properties.name,
                featureDesc: self.mapData.layersData[layerId].geoJson.features[arrayPosition].properties.desc
            }
            //get the template into html
            var html1 = featureDetailModal(templateParamObj);
            //load the region
            $("#modal").html(html1);
            //render the modal, firing the Bootstrap modal('show') ftn
            $("#featureDetailModal").modal("show");
            //attach event[s] AFTER the modal has rendered by hooking into the bootstrap event
            $("#modal").on("shown.bs.modal", function () {
                //clear old events on this id
                //TODO in the last interation of #modal, there may have been all sorts of
                //  elements with events attached . . . need a more robust unbind() here
                $("#mSaveButton").unbind();
                //assign the proper event
                $("#mSaveButton").on("click", function () {
                    var newFeatureName = $("#mFeatureName").val();
                    var newFeatureDesc = $("#mFeatureDesc").val();
                    self.mapData.layersData[layerId].geoJson.features[arrayPosition].properties.name = newFeatureName;
                    self.mapData.layersData[layerId].geoJson.features[arrayPosition].properties.desc = newFeatureDesc;
                    //TODO validate

                   //save off
                    data.saveLayer(self.mapData.layersData[layerId].geoJson, layerId, self.user).done(function(data){
                        console.log("back from save, data", data);
                        //close the modal
                        //first remove all event handlers from children of the modal
                        $("#modal").find('*').unbind();
                        $("#featureDetailModal").modal('hide');
                        //give the user a nice little sumthin sumthin
                        dispatch.trigger("app:popupMessage", "Saved", "mSaveButton");
                        //reburn layers
                        //TODO shouldn't we be replacing the local mapData object with the copy of current
                        //  data that the .ajax() returned rather than relying on the pre-save data?
                        self.removeRenderedLayers();
                        self.renderFromMapDataT();
                    });
                });
            });
        },
        initialize: function () {
            var self = this;
            this.data = data;
            this.baseUrl = dispatch.request("getBaseUrl");
            this.user = dispatch.request("userApp:getUserModel");
            this.initializeMap();
            this.initializeToolbar();
        },
        initializeMap: function () {
            var self = this;
            var center = [38.57, -109.54];
            var zoom = 10;
            $("#contentMain").html("<div id='map'></div>");
            //need to manually set icon path for requirejs build . . . 
            L.Icon.Default.imagePath = self.baseUrl + "assets/js/vendor/leaflet-0.7.7/images/";
            //L.tileLayer('http://localhost/tServer/api/eImg/{z}/{y}/{x}.jpg',{ 
			self.map = L.map('map').setView([38.57, -109.54], 14);
			L.tileLayer('http://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}.jpg', 
				{attribution: 'attributes here'
			}).addTo(self.map);		
            //assign local properties
            self.zoom = self.map.getZoom();
            self.center = self.map.getCenter();
            self.bounds = self.map.getBounds();            
            //assign events to button on popups
            self.map.on("popupopen", function(e) {
                console.log("e, popupopen", $(e.target));
                $(".btnFeatureDetail").on("click", function (e) {
                    var arrayPosition = $(e.target).attr('arrayposition');
                    var layerId = $(e.target).attr('layerid');
                    self.fireFeatureDetailModal(layerId, arrayPosition);
                });   
            });
            //keep track of map center, bounds, zoom.  'moveend' will fire on drag or zoom change
            self.map.on("moveend", function () {
                self.zoom = self.map.getZoom();
                self.center = self.map.getCenter();
                self.bounds = self.map.getBounds();
                //console.log(self.zoom, self.center, self.bounds);
            });
        },
        initializeToolbar: function () {
            var self = this;
            var customControl = L.Control.extend({
                options: {
                    position: 'topleft' 
                    //control position - allowed: 'topleft', 'topright', 'bottomleft', 'bottomright'
                },
                onAdd: function (map) {
                    var container = L.DomUtil.create('div');
                    container.style.position = 'absolute';
                    container.style.top = '0px',
                    container.style.left = '50px',
                    container.style.width = '300px';
                    //load from the template
                    container.innerHTML = lMapControl; 
                    return container;
                },
            });
            self.map.addControl(new customControl());
            $("#lMapControl a").on("click", function (e) {
                e.preventDefault();
                //bit of a hack here to make the dropdown toggle
                //see http://stackoverflow.com/questions/18855132/close-bootstrap-dropdown-after-link-click
                $(this).closest(".dropdown-menu").prev().dropdown("toggle");
                //console.log("clicked", e.target.id);
                switch(e.target.id){
					case "myMaps": 
						self.showMyMaps();
					break;
                    case "editLayer14":
                        self.editLayer = 14;
                        self.loadDrawControl();
                    break;
                    case "editLayer15":
                        self.editLayer = 15;
                        self.loadDrawControl();
                    break;
                    case "toggleDrawControl": 
                        console.log("toggleDrawControl");    
                    break;
					case "loadTopo":
						self.applyTileLayer("topo");
					break;
                    case "loadOsm":
                        self.applyTileLayer("osm");
                    break;
					case "loadSat":
						self.applyTileLayer("sat");
					break;
                    case "initializeLayersControl":
                        self.initializeLayersControl();
                        return false;
                    break;
                    case "createLayer":
                        self.createLayer();
                    break;
                    case "deactivateEdit":
                        self.removeEditor();
                    break;
                    case "createMap":
                        self.createMap();
                    break;
                };
                return false;
            });
        },
        createLayer: function () {
            data.createLayer(1).done( function (data) {
                console.log("data:", data);
            });
        },
        createMap: function () {
            var self = this;
            console.log("createMap() fires");
            
            //temp
            var name = "new map";
            var description = "new map description";
            var mapCenter = self.map.getCenter();
            var newMapZoom = self.map.getZoom();
            
            var newMapCentroid = {
                type: "POINT",
                coordinates: [
                    self.map.getCenter().lng,
                    self.map.getCenter().lat
                ]
            };
            console.log(newMapCentroid, newMapZoom);
            data.createMap(self.user, name, description, newMapCentroid, newMapZoom).done( function(data) {
                console.log("map create data:", data);
            });
        },
        loadMap: function (mapId) {
            var self = this;
            var baseUrl = this.baseUrl;
            //clean house every time you load a map
            self.map.remove();
            self.initializeMap();
            self.initializeToolbar();
            self.drawControl = undefined;
            self.overdays = [];
            self.editLayer = undefined;
            $.get(baseUrl + "api/maps/" + mapId, self.user.toJSON(), function (data){                
                success: {
                    self.mapData = data;
					//keep a local copy of what layers are hidden at self.hiddenLayers[]
					//also note, we only do this on the initial load.  after that, map will re-render, but we don't
					//want to mess with the status of the hidden layers variable as user could be changing it
					self.processHiddenLayers();					
					//render the map.  render also loads up the toolbar
                    self.renderFromMapDataT();
					
                }
            },"json");
        },
/*         loadDrawControl: function () {
			
            var self = this;
			
            console.log("self.editLayer", self.editLayer, "self.drawControl", self.drawControl);
            //remove existing drawControl, if there is one
            if (self.drawControl) {
				console.log("removing existing draw control");
                self.map.removeControl(self.drawControl);
				self.drawControl = undefined;
            };
            // Initialise the draw control and pass it the FeatureGroup of editable layer
			console.log("self.overlays @ editor init:", self.overlays);
			console.log("self.editLayer @ editor init:", self.editLayer);
            self.drawControl = new L.Control.Draw({
                edit: {
                    featureGroup: self.overlays[parseInt(self.editLayer)]
                },
                draw: {
                    //we don't do rectangles and circles, thank you
                    rectangle: false,
                    circle: false                    
                }
            });
            self.map.on('draw:created', function (e) {
                //add properties
                //Extremly important to read this: http://stackoverflow.com/questions/29736345/adding-properties-to-a-leaflet-layer-that-will-become-geojson-options
                var layer = e.layer,
                    feature = layer.feature = layer.feature || {}; // Initialize feature
                feature.type = feature.type || "Feature"; // Initialize feature.type
                var props = feature.properties = feature.properties || {}; // Initialize feature.properties
                props.name = "name";
                props.desc = "desc";
				props.icon = "fa%dot-circle-o";
                self.overlays[self.editLayer].addLayer(layer);                 
                //save off to db
                var rGeoJson = self.overlays[self.editLayer].toGeoJSON();
                self.data.saveLayer(rGeoJson, self.editLayer, self.user).done(function (data) {
                    //update local map data
                    self.mapData.layersData[data.updatedLayer.id] = data.updatedLayer;
                    //rerender map
                    self.renderAfterEdit();
                });
            });                    
            self.map.on('draw:edited', function (e) {
                var rGeoJson = self.overlays[self.editLayer].toGeoJSON();
                self.data.saveLayer(rGeoJson, self.editLayer, self.user).done(function (data) {
                    //rerender just to keep other data dependent things updated . . .
                    self.mapData.layersData[data.updatedLayer.id] = data.updatedLayer;
                    //rerender map
                    self.renderAfterEdit();                    
                });
            }); 
            self.map.on('draw:deleted', function (e) {
				console.log("draw:deleted fires", e);
                var rGeoJson = self.overlays[self.editLayer].toGeoJSON();
                self.data.saveLayer(rGeoJson, self.editLayer, self.user).done(function (data) {
                    //update local map data
                    self.mapData.layersData[data.updatedLayer.id] = data.updatedLayer;
                    //rerender map
                    self.renderAfterEdit();                 
                });                       
            });
            self.map.addControl(self.drawControl);
			self.renderFromMapDataT();
        }, */
		//fires after load data . . . keeps a local array of hidden layers
		processHiddenLayers() {
			var self = this;
			//clear the array
			self.hiddenLayers = [];
			//iterate through the data object and build the local array
			$.each( self.mapData.mapData.layers, function ( i, v ) {
				if( v.display != 'true' ) {
					self.hiddenLayers.push(parseInt(i));
				}
			});			
		},
        removeEditor: function () {
            var self = this;
            //remove the control
            if( self.drawControl ) {
                self.map.removeControl(self.drawControl);
                self.drawControl = undefined;
            }; 
            //set the property
            self.editLayer = undefined;
			self.renderFromMapDataT();
        },
        //kinda hackey . . . we dont' want to remove controls and non-feature Leaflet layers
        removeRenderedLayers: function () {
            var self = this;
            //remove all layers (that are features) from present map
            $.each(self.overlays, function (i, v) {
                if (v && v._layers) {
                    $.each(v._layers, function (ii, vv) {
                        self.map.removeLayer(vv);
                    });
                }
            });            
        },
        renderAfterEdit: function () {
            var self = this;
            //remove all layers (that are features) from present map
            $.each(self.overlays, function (i, v) {
                if (v && v._layers) {
                    $.each(v._layers, function (ii, vv) {
                        self.map.removeLayer(vv);
                    });
                }
            });
            //reset overlays variable
            self.overlays = [];
            self.renderFromMapDataT();
            //reload draw control
            if (self.drawControl) {
                self.map.removeControl(self.drawControl);
            };
            // Initialise the draw control and pass it the FeatureGroup of editLayer
            self.drawControl = new L.Control.Draw({
                edit: {
                    featureGroup: self.overlays[self.editLayer]
                },
                draw: {
                    //we don't do rectangles and circles, thank you
                    rectangle: false,
                    circle: false                    
                }
            });
            self.map.addControl(self.drawControl);           
        },
		//this is the one
		renderFromMapDataT: function () {
			var j;
			var self = this;
			//clean house
			self.removeRenderedLayers();
			$("#layersSelect").empty();
			$("#featuresSelect").empty();
            $.each(self.mapData.layersData, function (i, v) {
                //add a button to layers select dropdown
                var templateData = {
                    "i": i,
                    "name": v.name,
					"color": self.mapData.mapData.layers[i].style.color
                };
                //render li element from template to layers select
                $("#layersSelect").append(layersDropdown(templateData));
				//now adjust the buttons based on self.hiddenLayers
				$.each( self.hiddenLayers, function ( i,v ) {
					var ww = '#layerHide' + v.toString();
					$(ww).addClass('disabled');
					var yy = '#layerShow' + v.toString(); 
					$(yy).removeClass('disabled');	
				});				
				//and apply handlers to layersSeSelect
				$("#layersSelect button").click( function ( e ) {
					//it's actually the 'fa' icon <span> getting clicked [!?], so we need
					//to manually check for the enabled/ disabled class on the parent button
					// . . .  .  whatever :-P
					if ( $(e.target).parent().attr("class").includes("disabled") == false ) {
						var cc = $(e.target).parent().attr("id") ;
							var cmd = cc.substring(5,9);
							var layerId = cc.substring(9);
							switch ( cmd ) {
								case "Hide":
									//make sure we don't add it if already there
									if( self.hiddenLayers.indexOf( parseInt(layerId) ) == -1 ) {
										self.hiddenLayers.push( parseInt(layerId) );
									}
									self.renderFromMapDataT();									
								break;
								case "Show":
									var pos = self.hiddenLayers.indexOf( parseInt(layerId) );
									self.hiddenLayers = _.without( self.hiddenLayers, parseInt(layerId) );
									self.renderFromMapDataT();
								break;
								case "Edit":
									//strip out the edit layer id
									var el = parseInt($(e.target).parent().attr("id").substring(9));
									//show if hidden
									self.hiddenLayers = _.without( self.hiddenLayers, parseInt(layerId) );
									self.renderFromMapDataT();
									//set local variable
									self.editLayer = el;
									//fire editor
									self.loadDrawControl();
								break
							}							
					};
				});
                //render li element from template to features select
                //TODO fix, this doesn't load the template
                $("#featuresSelect").append("<li role='separator' class='divider'></li><li><a href='javascript:void(0)'><b>" + v.name + "</b></a></li>"); 
                //handle the case of an empty feature collection
                if (v.geoJson.features.length == 0) {
                    self.overlays[v.id] = new L.FeatureGroup();
                    self.map.addLayer(self.overlays[v.id]);
                //render, muthafucka'
                } else {
                    //we want to attach the array position and layerId to each feature, 
                    //  j is the geoJson array positon counter
                    j = 0;
                    //send the data to leaflet
                    self.overlays[v.id] = L.geoJson(v.geoJson, {
						filter: function ( feature ) {
							/* console.log("feature @ filter ftn: ", feature, "v.id:", v.id);
							if (self.mapData.mapData.layers[i].display == "true") {
								return true;
							} else {
								return false;
							} */
							if( self.hiddenLayers.indexOf( parseInt(v.id) ) == -1 ) {
								return true;
							} else {
								return false;
							}
						},
						//pointToLayer handles styling on points
						//this code runs like onEachFeature, but it's actually like onEachPoint . . . kinda?
						pointToLayer: function( feature, latlng ) {
					 		//we need to get the style info from the map object, not the layer object
							var iStyle = self.mapData.mapData.layers[i].style;
							//icon and prefix (fa or glyphicon) is on feature
							var iPrefix = feature.properties.icon.split("%")[0];
							var iIcon = feature.properties.icon.split("%")[1]
							var aedMarker = L.VectorMarkers.icon({
								//so . . . the icon is determined by layer
								icon: iIcon,
								prefix: iPrefix,
								// . .  and the colors are determined by the map object
								iconColor: iStyle.iconColor,
								markerColor: iStyle.markerColor
							});						
							return L.marker(latlng, {icon: aedMarker});
						},
						//now, style will handle linestring and polygon
						//though this fires also on fucking points????? wtf???
						style: function ( feature ) {
							//we need to get the style info from the map object, not the layer object
							var iStyle = self.mapData.mapData.layers[i].style;
							//we're using the same config object to style points, lines, and polygons.  the only conflict is "fill" with linestring and polygon.  if fill is true, it fills lines (which we never want) AND polygons, so we filter . . .
							//this is profoundly fucking confusing, but it works
							if(feature.geometry.type == "LineString") {
								return {
									color: iStyle.color, 
									fill: false,		//this is the difference and why we have these ifs
									fillColor: iStyle.fillColor,
									fillOpacity: iStyle.fillOpacity,
									opacity: iStyle.opacity,
									stroke: true,
									weight: iStyle.weight, 
									opacity: iStyle.opacity,
								};								
							};
							if(feature.geometry.type == "Polygon") {
								//HORRIBLE lEAFLET BUG!!!!  HACK!!!! HACK!!! 
								//I cannot consistently pass iStyle.polyStroke to the return, but if i recast it as the var getaroundhack, it works.  
								//this is the craziest bullshit i've ever seen . . . it won't replicate the variable or whatever . . .absulutely  crazy, but this is the hack to get the value of iStyle.polyStroke into the return . . this SUCKS, man . . .I'll take the  . . . it
								if(iStyle.polyStroke == "true") {
									var getaroundhack = true;
								} else {
									var getaroundhack = false;
								}
								return {
									color: iStyle.color, 
									fill: iStyle.fill,		//and here we default to the style
									fillColor: iStyle.fillColor,
									fillOpacity: iStyle.fillOpacity,
									opacity: iStyle.opacity,
									//AND HERE'S THE GETAROUND HACK SINCE I CANT PASS THE VARIABLE OR WHAT THE FUCK EVER.  ARRRRRRRRRRRRRGHHHHHHHH!!!!!!!!!!!!!!!!
									stroke: getaroundhack,
									weight: iStyle.weight, 
									opacity: iStyle.opacity,
								};
							};
						},
                        //iterate through each feature, add popup, do what needs to be done
                        //@param feature is the geoJson Object
                        //@param layer is the leaflet class
                        onEachFeature: function (feature, layer) {
                            //feature.properties.local is only used client side for each feature
                            //it is stripped away from db saves
                            feature.properties.local = {};
                            feature.properties.local.arrayPosition = j;
                            feature.properties.local.layerId = v.id;
                            //fire the popup potentialusing a template
                            var popupHtml = (popupTemplate(feature.properties));
                            layer.bindPopup(popupHtml);
                            //add an item to featuresSelect
                            var p = {
                                "arrayPosition": feature.properties.local.arrayPosition,
                                "layerId": feature.properties.local.layerId,
                                "name": feature.properties.name,
                                "desc": feature.properties.desc
                            };
                            $("#featuresSelect").append(featuresDropdown(p));
                            // advance the array position counter
                            j += 1;
                        }
                    }).addTo(self.map);
                }
            });			
		},
		showMyMaps: function () {
			var self = this;
			data.getMyMaps(self.user).done(function (data){
				//use empty to remove any residual event handlers
				$("#modal").empty();
				//get the template into html, handing it the maps array
				var html1 = myMapsModal();
				//load the region
				$("#modal").html(html1);
				//load the maps
				$.each(data.maps, function (i, map) {
					$("#myMapsTable").append("<tr mapId=" + map.id + "><td>" + map.name + "</td><td>" +  map.description +"</td></tr>");
				});
				//render the modal, firing the Bootstrap modal() ftn
				$("#myMapsModal").modal("show");
				//attach event
				$("#modal").on("shown.bs.modal", function () {
					$("tr").on("click", function () {
						dispatch.trigger("app:navigate", "maps/" + $(this).attr("mapId"));
					}); 
				});				
			});
		}
    }
    return mapApp;
});
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
    'leaflet.draw',
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
        //drawControl is the leaflet.draw object itself
        drawControl: undefined,
        //editLayer, int, the layerId active in the editor
        editLayer: undefined,
        selectedLayer: undefined,
        selectedFeatureArrayPos: undefined,
        center: undefined, //the map center, updated when user moves or zooms
        zoom: undefined, //int zoom
        bounds: undefined, //
        
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
        initializeLayersControl: function () {
            var self = this;
            console.log("sl", self.overlays);
            //layers control
            L.control.layers(null, self.overlays).addTo(self.map);
        },
        initializeMap: function () {
            var self = this;
            var mapCenter = [38.57, -109.54];
            var mapZoom = 14;
            $("#contentMain").html("<div id='map'></div>");
            
            this.map = L.map('map', {
                    //drawControl: true
                }).setView( mapCenter, mapZoom );
                
            //need to manually set icon path for requirejs build . . . 
            L.Icon.Default.imagePath = self.baseUrl + "assets/js/vendor/leaflet-0.7.7/images/";
            
            //L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {                
            //L.tileLayer('http://localhost/tServer/api/eImg/{z}/{y}/{x}.jpg',{ 
			
			/* var Esri_WorldImagery = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
				attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community' */

            /* var jjj = L.tileLayer('http://localhost/tServer/api/eImg/{z}/{y}/{x}.jpg',{ */
				
            L.tileLayer('http://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}.jpg', {
                attribution: 'attributes here'
				
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
                console.log(self.zoom, self.center, self.bounds);
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
                    case "loadMap9":
                        self.loadMap(9, self.user);
                    break;
                    case "initializeLayersControl":
                        self.initializeLayersControl();
                        return false;
                    break;
                    case "renderMap":
                        self.render();
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
					//debug start . . . 
                    self.renderFromMapDataT();
                }
            },"json");
        },
        loadDrawControl: function () {
            var self = this;
            console.log("self.editLayer", self.editLayer, "self.drawControl", self.drawControl);
            //remove existing drawControl, if there is one
            if (self.drawControl) {
                self.map.removeControl(self.drawControl);
            };
            // Initialise the draw control and pass it the FeatureGroup of editable layer
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
            self.map.on('draw:created', function (e) {
                //add properties
                //see: http://stackoverflow.com/questions/29736345/adding-properties-to-a-leaflet-layer-that-will-become-geojson-options
                var layer = e.layer,
                    feature = layer.feature = layer.feature || {}; // Initialize feature

                feature.type = feature.type || "Feature"; // Initialize feature.type
				
                var props = feature.properties = feature.properties || {}; // Initialize feature.properties
                props.name = "name";
                props.desc = "desc";
				props.icon = "fa%dot-circle-o";
				console.log("feature2", feature);
				alert("wait!");
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
        },
        removeEditor: function () {
            var self = this;
            //remove the control
            if (self.drawControl) {
                self.map.removeControl(self.drawControl);
                self.drawControl = undefined;
            }; 
            //set the property
            self.editLayer = undefined;            
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
		renderFromMapDataT: function () {
			var j;
			var self = this;
			console.log("sMD:", self.mapData);

            $.each(self.mapData.layersData, function (i, v) {
                //add a button to layers select dropdown
                var templateData = {
                    "i": i,
                    "name": v.name
                };
                //render li element from template to layers select
                $("#layersSelect").append(layersDropdown(templateData));
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
						//pointToLayer handles styling on points
						//this code runs like onEachFeature, but it's actually like onEachPoint . . . kinda?
						 pointToLayer: function( feature, latlng ) {
								//we need to get the style info from the map object, not the layer object
								var iStyle = self.mapData.mapData.layers[i].style;
								console.log("iStyle:", iStyle);
								var iPrefix = feature.properties.icon.split("%")[0];
								var iIcon = feature.properties.icon.split("%")[1]
								var aedMarker = L.VectorMarkers.icon({
								icon: iIcon,
								prefix: iPrefix,
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
							console.log("nonPOINT feature:", feature);
							return {
								//TODO: fill is fucked up, linestring and polygon read same??
								color: iStyle.color, 
								fill: iStyle.fill,
								fillColor: iStyle.fillColor,
								fillOpacity: iStyle.fillOpacity,
								opacity: iStyle.opacity,
								stroke: iStyle.polyStroke,
								weight: iStyle.weight, 
								opacity: iStyle.opacity,
								
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
				console.log("data", data);
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
						console.log($(this).attr("mapId"));
						dispatch.trigger("app:navigate", "maps/" + $(this).attr("mapId"));
						
					}); 
				});				
			});
		}
    }
    return mapApp;
});
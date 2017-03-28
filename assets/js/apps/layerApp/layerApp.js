define ([
	'common/dispatch',
	'backbone',
	'bootstrap',
	'leaflet',
	'leaflet.draw',
	'leaflet-vector-markers'

], function (
	dispatch,
	Backbone,
	Bootstrap,
	L
) {
	'use strict'
	var layerApp = {
		//properties:
		baseUrl: undefined,
		bounds: undefined,
		center: undefined,
		drawControl: undefined,
		layerData: undefined,
		overlay: undefined,
		map: undefined,
		user: undefined,
		zoom: undefined,
		//methods:
		initialize: function () {
			console.log("layerApp initializes . . . ");
            this.baseUrl = dispatch.request("getBaseUrl");
            this.user = dispatch.request("userApp:getUserModel");			
			this.initializeMap();			
		},
		initializeMap: function(){
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
		loadLayer: function(layerId) {
			var self = this;
            $.get(self.baseUrl + "api/layers/" + layerId, self.user.toJSON(), function (data){                
                success: {
                    self.data = data;
                    self.renderFromLayerData();
                }
            },"json");			
		},
		renderFromLayerData: function(){
			var self = this;
			console.log("render Fires", self.layerData);
			self.overlay = L.geoJson(self.data.layerData.geoJson, {
				style:
			}).addTo(self.map);	
			//add the editor
            self.drawControl = new L.Control.Draw({
                edit: {
                    featureGroup: self.overlay
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
			
		}
	}
	return layerApp;
});
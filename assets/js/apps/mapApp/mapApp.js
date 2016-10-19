define ([
    'common/dispatch',
    'apps/mapApp/data/data',
    'text!apps/mapApp/templates/lMapControl.tpl',
    'tpl!apps/mapApp/templates/popupTemplate.tpl',
    'backbone',
    'leaflet',    
    'leaflet.draw',
], function (
    dispatch,
    data,
    lMapControl,
    popupTemplate,
    Backbone,
    L

) {
    var mapApp = {
        
        user: {},
        map: {},
        mapData: {},
        overlays: [],
        drawcontrol: undefined,
        editLayer: undefined,
        
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
            
            this.map = L.map('contentMain', {
                    //drawControl: true
                }).setView( mapCenter, mapZoom );
            //L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {                
            //L.tileLayer('http://localhost/tServer/api/eImg/{z}/{y}/{x}.jpg',{ 
            L.tileLayer('http://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}.jpg', {
                attribution: 'attributes here'
            }).addTo(self.map);            
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
                    container.style.width = '300px'
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
                    case "editLayer1":
                        self.editLayer = 7;
                        self.loadDrawControl();
                    break;
                    case "editLayer2":
                        self.editLayer = 8;
                        self.loadDrawControl();
                    break;
                    case "toggleDrawControl": 
                        console.log("toggleDrawControl");    
                    
                    break;
                    case "loadMap2":
                        self.loadMap(2, self.user);
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
                };
                return false;
            });            
        },
        createLayer: function () {
            data.createLayer(1).done( function (data) {
                console.log("data:", data);
            });
        },
        loadMap: function (mapId, user) {
            var self = this;
            var baseUrl = this.baseUrl;
            //clean house every time you load a map
            self.map.remove();
            self.initializeMap();
            self.initializeToolbar();
            self.drawControl = undefined;
            self.overdays = [];
            $.get(baseUrl + "api/maps/" + mapId, user.toJSON(), function (data){                
                success: {
                    self.mapData = data;
                    self.reRenderFromMapData();
                }
            },"json");
        },
        loadDrawControl: function () {
            var self = this; 
            //remove existing drawControl, if there is one
            if (self.drawControl) {
                self.map.removeControl(self.drawControl);
            };
            // Initialise the draw control and pass it the FeatureGroup of editable layers
            self.drawControl = new L.Control.Draw({
                edit: {
                    featureGroup: self.overlays[self.editLayer]
                }
            });
            self.map.on('draw:created', function (e) {
                //add properties
                //see: http://stackoverflow.com/questions/29736345/adding-properties-to-a-leaflet-layer-that-will-become-geojson-options
                var layer = e.layer,
                    feature = layer.feature = layer.feature || {}; // Initialize feature

                feature.type = feature.type || "Feature"; // Initialize feature.type
                var props = feature.properties = feature.properties || {}; // Initialize feature.properties
                props.mto = {
                    name: "name",
                    desc: "desc"
                };
                self.overlays[self.editLayer].addLayer(layer);                 
                
                //save off to db
                var rGeoJson = self.overlays[self.editLayer].toGeoJSON();
                self.data.saveLayer(rGeoJson, self.editLayer, self.user).done(function (data) {
                    //update local map data
                    self.mapData.layersData[data.rLayer.id] = data.rLayer;
                    //rerender map
                    self.render();
                });
            });                    
            self.map.on('draw:edited', function (e) {
                var rGeoJson = self.overlays[self.editLayer].toGeoJSON();
                self.data.saveLayer(rGeoJson, self.editLayer, self.user);
            }); 
            self.map.on('draw:deleted', function (e) {
                var rGeoJson = self.overlays[self.editLayer].toGeoJSON();
                self.data.saveLayer(rGeoJson, self.editLayer, self.user);                        
            });
            self.map.addControl(self.drawControl);
        },
        render: function () {
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
 
            self.reRenderFromMapData();
            
            //reload draw control
            if (self.drawControl) {
                self.map.removeControl(self.drawControl);
            };
            // Initialise the draw control and pass it the FeatureGroup of editable layers
            self.drawControl = new L.Control.Draw({
                edit: {
                    featureGroup: self.overlays[self.editLayer]
                }
            });
            self.map.addControl(self.drawControl);           
            
        },
        reRenderFromMapData: function () {
            var self = this;
            $.each(self.mapData.layersData, function (i, v) {
                //handle the case of an empty feature collection
                if (v.geoJson.features.length == 0) {
                    self.overlays[v.id] = new L.FeatureGroup();
                    self.map.addLayer(self.overlays[v.id]);
                } else {
                   //we want to attach the array position to each feature, i is the counter
                    var i = 0;
                    self.overlays[v.id] = L.geoJson(v.geoJson, {
                        //iterate through each feature, add popup, do what needs to be done
                        //feature is the geoJson Object
                        //layer is the leaflet class
                        
                        onEachFeature: function (feature, layer) {
                            feature.properties.mto.arrayPosition = i;
                            feature.properties.mto.layerId = v.id;
                            i += 1;
                            console.log("feature:", feature, "layer", layer);
                            var popupHtml = (popupTemplate(feature.properties.mto));
                            layer.bindPopup(popupHtml);
                        }
                    }).addTo(self.map); 
                }
            });                   
        }

    }
    
    return mapApp;


});
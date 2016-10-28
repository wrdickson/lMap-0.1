define ([
    'common/dispatch',
    'apps/mapApp/data/data',
    'text!apps/mapApp/templates/lMapControl.tpl',
    'tpl!apps/mapApp/templates/popupTemplate.tpl',
    'tpl!apps/mapApp/templates/layersDropdown.tpl',
    'tpl!apps/mapApp/templates/featuresDropdown.tpl',
    'tpl!apps/mapApp/templates/featureDetailModal.tpl',
    'backbone',
    'leaflet',    
    'leaflet.draw',
], function (
    dispatch,
    data,
    lMapControl,
    popupTemplate,
    layersDropdown,
    featuresDropdown,
    featureDetailModal,
    Backbone,
    L
) {
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
        //drawControlis the leaflet.draw object itself
        drawControl: undefined,
        //editLayer, int, the layerId active in the editor
        editLayer: undefined,
        selectedLayer: undefined,
        selectedFeatureArrayPos: undefined,
        
        fireFeatureDetailModal: function(layerId, arrayPosition) {
            var self = this;
            //clean out the dialog div
            $("#modal").html('');
            //create a param object for the template
            console.log("layerId", layerId);
            console.log("arrayPosition", arrayPosition);
            var templateParamObj = {
                featureName: self.mapData.layersData[layerId].geoJson.features[arrayPosition].properties.mto.name,
                featureDesc: self.mapData.layersData[layerId].geoJson.features[arrayPosition].properties.mto.desc
            }
            //get the template into html
            var html1 = featureDetailModal(templateParamObj);
            //load the region
            $("#modal").html(html1);
            //render the modal, firing the Bootstrap modal() ftn
            $("#featureDetailModal").modal("show");
            //attach event
            $("#modal").on("shown.bs.modal", function () {
                $("#mSaveButton").unbind();
                $("#mSaveButton").on("click", function () {
                    var newFeatureName = $("#mFeatureName").val();
                    var newFeatureDesc = $("#mFeatureDesc").val();
                    self.mapData.layersData[layerId].geoJson.features[arrayPosition].properties.mto.name = newFeatureName;
                    self.mapData.layersData[layerId].geoJson.features[arrayPosition].properties.mto.desc = newFeatureDesc;
                    //TODO validate
                    
                    //save off
                    data.saveLayer(self.mapData.layersData[layerId].geoJson, layerId, self.user).done(function(data){
                        console.log("back from save, data", data);
                        //close the modal
                        //first remove all event handlers from children of the modal
                        $("#modal").find('*').unbind();
                        $("#featureDetailModal").modal('hide');
                        dispatch.trigger("app:popupMessage", "Saved", "mSaveButton");
                        self.removeRenderedLayers();
                        self.renderFromMapData();
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
            //L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {                
            //L.tileLayer('http://localhost/tServer/api/eImg/{z}/{y}/{x}.jpg',{ 
            var jjj = L.tileLayer('http://localhost/tServer/api/eImg/{z}/{y}/{x}.jpg',{
            //L.tileLayer('http://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}.jpg', {
                attribution: 'attributes here'
            }).addTo(self.map);
            //assign events to button on popups
            self.map.on("popupopen", function(e) {
                console.log("e, popupopen", $(e.target));
                $(".btnFeatureDetail").on("click", function (e) {
                    var arrayPosition = $(e.target).attr('arrayposition');
                    var layerId = $(e.target).attr('layerid');
                    self.fireFeatureDetailModal(layerId, arrayPosition);
                });   
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
                    case "editLayer13":
                        self.editLayer = 13;
                        self.loadDrawControl();
                    break;
                    case "editLayer8":
                        self.editLayer = 8;
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
        loadMap: function (mapId, user) {
            var self = this;
            var baseUrl = this.baseUrl;
            //clean house every time you load a map
            self.map.remove();
            self.initializeMap();
            self.initializeToolbar();
            self.drawControl = undefined;
            self.overdays = [];
            self.editLayer = undefined;
            $.get(baseUrl + "api/maps/" + mapId, user.toJSON(), function (data){                
                success: {
                    self.mapData = data;
                    self.renderFromMapData();
                }
            },"json");
        },
        loadDrawControl: function () {
            var self = this;
            console.log("self.editLayer", self.editLayer, "self.drawControl", self.drawControl);
            var self = this; 
            //remove existing drawControl, if there is one
            if (self.drawControl) {
                self.map.removeControl(self.drawControl);
            };
            // Initialise the draw control and pass it the FeatureGroup of editable layers
            self.drawControl = new L.Control.Draw({
                edit: {
                    featureGroup: self.overlays[self.editLayer]
                },
                draw: {
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
                props.mto = {
                    name: "name",
                    desc: "desc",
                    local: {}
                };
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
                    console.log("response from layer save:", data);
                    //rerender just to keep other data dependent things updated . . .
                    self.mapData.layersData[data.updatedLayer.id] = data.updatedLayer;
                    //rerender map
                    self.renderAfterEdit();                    
                    
                });;
            }); 
            self.map.on('draw:deleted', function (e) {
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
 
            self.renderFromMapData();
            
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
        renderFromMapData: function () {
            var j;
            var self = this;
            //clear out layersSelect dropdown
            $("#layersSelect").html('');
            //clear out featuresSelect dropdown
            $("#featuresSelect").html('');
            //remove events from old buttons
            $(".layerSelect").unbind();
            $(".featureSelect").unbind();
            //iterate through the layers
            $.each(self.mapData.layersData, function (i, v) {
                //add a button to layers select dropdown
                var templateData = {
                    "i": i,
                    "name": v.name
                };
                //render li element from template to layers select
                $("#layersSelect").append(layersDropdown(templateData));
                //render li element from template to features select
                $("#featuresSelect").append("<li role='separator' class='divider'></li><li><a href='javascript:void(0)'><b>" + v.name + "</b></a></li>");
                //handle the case of an empty feature collection
                if (v.geoJson.features.length == 0) {
                    self.overlays[v.id] = new L.FeatureGroup();
                    self.map.addLayer(self.overlays[v.id]);
                //render, muthafucka'
                } else {
                    //we want to attach the array position and layerId to each feature, j is the geoJson array positon counter
                    j = 0;
                    //send the data to leaflet
                    self.overlays[v.id] = L.geoJson(v.geoJson, {
                        //iterate through each feature, add popup, do what needs to be done
                        //@param feature is the geoJson Object
                        //@param layer is the leaflet class
                        onEachFeature: function (feature, layer) {
                            
                            //feature.properties.mto.local is only used client side for each feature
                            //it is stripped away from db saves
                            feature.properties.mto.local = {};
                            feature.properties.mto.local.arrayPosition = j;
                            feature.properties.mto.local.layerId = v.id;
                            
                            //fire the popup potential
                            var popupHtml = (popupTemplate(feature.properties.mto));
                            layer.bindPopup(popupHtml);
                            
                            //add an item to featuresSelect
                            var p = {
                                "arrayPosition": feature.properties.mto.local.arrayPosition,
                                "layerId": feature.properties.mto.local.layerId,
                                "name": feature.properties.mto.name,
                                "desc": feature.properties.mto.desc
                            };
                            $("#featuresSelect").append(featuresDropdown(p));
                            // advance the array position counter
                            j += 1;
                        }
                    }).addTo(self.map);

                }
            });
            $(".layerSelect").on("click", function (e) {
                self.editLayer = $(e.target).attr('mdata');
                self.loadDrawControl();
                //self.removeRenderedLayers();
                //self.renderFromMapData();
            });
            $(".featureSelect").on("click", function (e) {
                var layerId = $(e.target).attr('layerid');
                var arrayPosition = $(e.target).attr('arrayPosition');
                self.fireFeatureDetailModal(layerId, arrayPosition);
            });

            
        }
    }
    
    return mapApp;


});
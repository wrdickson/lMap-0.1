define ([
    'common/dispatch',
    'backbone'
], function (
    dispatch,
    Backbone
) {
    var data = {
        createLayer: function (userId) {
            var deferred = $.Deferred();
            var baseUrl = dispatch.request("getBaseUrl");
            var params = {
                    user: userId
                };
            console.log("params", params);
            var promise = $.ajax({
                method: "POST",
                url: baseUrl + "api/layers/",
                //don't fucking forget this!!!
                data: JSON.stringify(params),
                success: function (data) {
                    console.log("data", data);
                    deferred.resolve(data);
                },
                dataType: "json"
            });
            return deferred.promise();
        },
        createMap: function(user, name, description, centroid, zoom) {
            var deferred = $.Deferred();
            var baseUrl = dispatch.request("getBaseUrl");
            var params = {
                user: user.toJSON(),
                name: name,
                description: description,
                centroid: centroid,
                zoom: zoom                
            };
            var promise = $.ajax({
                method: "POST",
                url: baseUrl + "api/maps/",
                data: JSON.stringify(params),
                success: function (data) {
                    deferred.resolve(data);
                },
                dataType: "json"
            });            
            return deferred.promise();
        },
        saveLayer: function (geoJson, layerId, user) {
            //strip "local"  and "layerId" from the properteis
            $.each(geoJson.features, function(i,v) {
                delete v.properties.mto.local;
                
            });
            var deferred = $.Deferred();
            var baseUrl = dispatch.request("getBaseUrl");
            var params = {
                    user: user.toJSON(),
                    geoJson: geoJson
                };
            var promise = $.ajax({
                method: "PUT",
                url: baseUrl + "api/layers/" + layerId,
                //don't fucking forget this!!!
                data: JSON.stringify(params),
                success: function (data) {
                    deferred.resolve(data);
                },
                dataType: "json"
            });
            return deferred.promise();
        }
    };
    
    return data;

});
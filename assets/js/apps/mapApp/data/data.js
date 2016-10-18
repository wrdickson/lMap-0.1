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
        saveLayer: function (geoJson, layerId, user) {
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
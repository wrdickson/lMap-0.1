define([
	'common/dispatch'
], function (
	dispatch
) {

	'use strict'

	var data = {
        saveLayer: function (geoJson, layerId, user) {
            //strip "local" from properties.mto before
            //  sending the geoJson back to server for save
            $.each(geoJson.features, function(i,v) {
                delete v.properties.local;
            });
            var deferred = $.Deferred();
            var baseUrl = dispatch.request("getBaseUrl");
            var params = {
                    user: user.toJSON(),
                    geoJson: geoJson
                };
            dispatch.trigger("app:spinOn");
            var promise = $.ajax({
                method: "PUT",
                url: baseUrl + "api/layers/" + layerId,
                //don't fucking forget this!!!
                data: JSON.stringify(params),
                success: function (data) {
                    deferred.resolve(data);
                },
                error: function (data) {
                    console.log("saveLayer throws an error", data);
                    //dispatch.trigger("app:popupMessage", "Permission Denied", null);
					dispatch.trigger("app:spinOff");
                },
                complete: function (data) {
                    dispatch.trigger("app:spinOff");
                },
                dataType: "json"
            });
            return deferred.promise();
        }
	}
	return data;

});
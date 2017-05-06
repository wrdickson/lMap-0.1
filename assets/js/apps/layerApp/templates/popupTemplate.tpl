<label for="mFeatureName">Name:</label><br/>
<input id="mFeatureName" type="text" value='<%= name %>'/><br/>
<label for="mFeatureDesc">Description:</label><br/>
<textarea style="width: 100%" id="mFeatureDesc" type="text" ><%= desc %></textarea><br/>
<button arrayposition=<%= local.arrayPosition %> type='button' class='btnFeatureDetail btn btn-default btn-xs' >
	<span arrayposition=<%= local.arrayPosition %> class="fa fa-gear"></span>
</button>
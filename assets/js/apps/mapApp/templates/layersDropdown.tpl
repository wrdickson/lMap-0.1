<li class='layerSelectLi'>
    <a href='javascript:void(0)'>
        <span style="color:<%= color %>"><%= name %>&nbsp;&nbsp;</span>
		<button id='layerHide<%= i %>' type='button' class='btn btn-default btn-xs pull-right layerHide' title='Hide Layer' >
			<span class='fa fa-eye-slash' mdata=<%= i %>></span>
		</button>		
		<button id='layerShow<%= i %>' type='button' class='btn btn-default btn-xs pull-right layerShow disabled' title='Show Layer' >
			<span class='fa fa-eye' mdata=<%= i %>></span>
		</button>
    </a>
</li>
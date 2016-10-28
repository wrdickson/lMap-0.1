<!--featureDetailModal.tpl-->
<div id="featureDetailModal" class="modal fade">
    <div class="modal-dialog modal-sm">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                <b class="modal-title">Feature Details</b>
            </div>
            <div class="modal-body">
                <p>Name:
                    <input id="mFeatureName" type="text" value='<%= featureName %>'/>
                </p>
                <p>Description:
                    <input id="mFeatureDesc" type="text" value='<%= featureDesc %>'/>
                </p>
                <h4><span id="mLoginAlert" class="label label-warning" display="none"></span></h4>
            </div>
            <div class="modal-footer">
                <button id = "mSaveButton" type="button" class="btn btn-primary" >Save</button>
                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>
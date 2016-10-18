<!--testModal.tpl-->
<div id="userLoginModal" class="modal fade">
    <div class="modal-dialog modal-sm">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                <h4 class="modal-title">Login</h4>
            </div>
            <div class="modal-body">
                <label for="mUserName">Username:</label><br/>
                <input type="text" id="mUserName"><br/>
                <label for="mUserPwd">Password:</label><br/>
                <input type="text" id="mUserPwd"><br/>
                <h4><span id="mLoginAlert" class="label label-warning" display="none"></span></h4>
            </div>
            <div class="modal-footer">
                <button id = "mLoginButton" type="button" class="btn btn-primary" >Login</button>
                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>
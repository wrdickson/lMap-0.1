//userApp.js
define([
    'backbone',
    'common/dispatch',
    'tpl!apps/userApp/templates/userLoginModal.tpl',
	'jquery'
], function (
    Backbone,
    dispatch,
    userLoginModal
) {
    
    'use strict'
    
    //PRIVATE VARIABLES:
    var baseUrl;
    var userModel;
    
    var UserModel = Backbone.Model.extend({
        initialize: function(){
            this.on("change", function () {
                dispatch.trigger("userModel:change", this);
            });
            var baseUrl = dispatch.request("getBaseUrl");
        },
        setToGuest: function () {
            this.set({
                "mUserId": 0,
                "mUserKey": 0,
                "mUserPerm": 0,
                "mUserName": "Guest"
            });
            userApp.setMenuToLogin();
			$(".collapse").collapse('hide');
        }
    });    

    var UserApp = {
        userModel: {},
        initialize: function () {
            var self = this;
            console.log("userApp initializes . . . ");
            self.baseUrl = dispatch.request("getBaseUrl");
            this.userModel = new UserModel();
            console.log("mUser:", mUser);
            this.userModel.set(mUser);
            //set the menu appropriately
            if(this.userModel.get("mUserId") > 0 ) {
                //render
                this.setMenuToUser();
            } else {
                this.setMenuToLogin();
            }
            $("#mLogoff").on("click", function () {
                self.logoff();
            });

        },
        fireLoginModal: function() {
            var self = this;
            //clean out the dialog div
            $("#modal").html('');
            //get the template into html
            var html1 = userLoginModal();
            //load the region
            $("#modal").html(html1);
            //render the modal, firing the Bootstrap modal() ftn
            $("#userLoginModal").modal("show");
            //attach event
            $("#modal").on("shown.bs.modal", function () {
                $("#mLoginButton").unbind();
                $("#mLoginButton").on("click", function () {
                    self.login();
                });
            });            
        },
        login: function () {
            var self = this;
            var param = {};
            //scrape the inputs . . . 
            param.username = $("#mUserName").val();
            param.password = $("#mUserPwd").val();
            dispatch.trigger("app:spinOn");
            //send off the request . . . 
            $.ajax({
                url: self.baseUrl + "api/login/",
                type: "GET",
                data: param,
                dataType: "json",
                success: function (data) { 
					dispatch.trigger("app:spinOff");
                    //TODO: handle a failed login, not just error as below . . . 
                    if(data.id > 0){
                        //login passes  ... continue .
                        //reload the model
                        self.userModel.set({
                            "mUserId": data.id,
                            "mUserKey": data.key,
                            "mUserName": data.username,
                            "mUserPerm": data.permission
                        });
                        //close the modal
                        $("#userLoginModal").modal('hide');
                        
                        $("#modal").on("hidden.bs.modal", function () {
                            $("#userLoginModal").remove();
                            $("#modal").html("");
                            var message = "Logged in as:<br/>" + data.username;
                            dispatch.trigger("app:popupMessage", message, "null");
                        });
                        self.setMenuToUser();
                    
                       
                        
                    } else { 
                        //login failed
                        //alert the modal
                        $("#mLoginAlert").html("Login Failed");
                        $("#mLoginAlert").slideDown("slow");
                    }
                },
                error: function (error) {
					dispatch.trigger("app:spinOff");
                }
            }, this);                   
        },        
        logoff: function () {
			dispatch.trigger("app:spinOn");
            console.log("user at logoff: ", this.userModel.toJSON());
            var self = this;
            $.ajax({
                url: self.baseUrl + "api/logoff/",
                data: self.userModel.toJSON(),
                
                success: function(d) {
                    console.log("logoff response: ", d);
                    //remove user dropdown
                    self.setToGuest();
                    self.setMenuToLogin();
                },
                error: function() {
                    self.setToGuest();
                    self.setMenuToLogin();
                },
				complete: function () {
                    dispatch.trigger("app:spinOff");
                    var message = "Logged off.";
                    dispatch.trigger("app:popupMessage", message, null);                    
				},
                dataType: "json"
            });
        },        
        setMenuToLogin: function () {
            var self = this;
            $("#signUpLi").removeClass("hidden");
            $("#userDropdown").addClass("hidden");
            $("#loginLi").removeClass("hidden");
            //if you don't do this, subsequent modal will fail
            $("#loginLi").unbind();
            $("#loginLi").on("click", function () {
                self.fireLoginModal();
            });
        },
        setMenuToUser: function () {
            //hide login
            $("#signUpLi").addClass("hidden");
            //inject username
            $("#menuUsername").html(UserApp.userModel.get("mUserName") + '<span class="caret"></span>');
            //show the user dropdown
            $("#userDropdown").removeClass("hidden");
            //hide login
            $("#loginLi").addClass("hidden");
            //clear old events
            $("#logoffLi").unbind();
            //attach events
            $("#logoffLi").on("click", function (e) {
				//reapply preventDefault(), since we just unbound it . . . 
				e.preventDefault();
                userApp.userModel.logoff();
            });  
			//show the admin link if user has perms
			if(this.userModel.get("miffUserPerm") > 7){
				$("#adminToggleLi").removeClass("hidden");
			}else{
				$("#adminToggleLi").addClass("hidden");	
			}
        },
        setToGuest: function () {
            this.userModel.set({
                "mUserId": 0,
                "mUserKey": 0,
                "mUserName": "Guest",
                "mUserPerm": 0
            });                        
        }
    }
    
    dispatch.setHandler("userApp:getUserModel", function() {
        return UserApp.userModel;
    });
    
    return UserApp;

});
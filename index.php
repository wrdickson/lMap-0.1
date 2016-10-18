<?php 
    session_start();
    define('BASE_URL', "http://lMap-0.1/");
?>
<!DOCTYPE html>
<html>
	<head>
		<title>
			singlePageTemplate
		</title>
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="viewport" content="width=device-width, initial-scale=1">
        
        <!-- use absolute urls or it fails when routed -->
		<link rel="stylesheet" href="<?php echo BASE_URL;?>assets/css/application.css">
		<link rel="stylesheet" href="<?php echo BASE_URL;?>assets/js/vendor/bootstrap/dist/css/bootstrap.css">
		<link rel="stylesheet" href="<?php echo BASE_URL;?>assets/js/vendor/bootstrap/dist/css/bootstrap-theme.min.css"> 
        <link rel="stylesheet" href="<?php echo BASE_URL;?>assets/css/animate.css">
        <link rel="stylesheet" href="<?php echo BASE_URL?>assets/js/vendor/leaflet-0.7.7/leaflet.css">    
        <link rel="stylesheet" href="<?php echo BASE_URL?>assets/js/vendor/leaflet-draw/leaflet.draw.css"> 
        <link rel="stylesheet" href="<?php echo BASE_URL?>assets/css/font-awesome-4.6.3/css/font-awesome.min.css">
        <?php
            //get session user data if available
            //this is to handle the situation where a user refreshes or manually enters a url
            if(isset($_SESSION['mUserId']) && isset($_SESSION['mUserKey']) && isset($_SESSION['mUserPerm'])){
            
            }else{
                $_SESSION['mUserId'] = 0;
                $_SESSION['mUserKey'] = 0;
                $_SESSION['mUsername'] = "Guest";
                $_SESSION['mUserPerm'] = 0;
            }
            $mUser = array();
            $mUser['mUserId'] = $_SESSION['mUserId'];
            $mUser['mUserKey'] = $_SESSION['mUserKey'];
            $mUser['mUserName'] = $_SESSION['mUsername'];
            $mUser['mUserPerm'] = $_SESSION['mUserPerm'];
            $userJson = json_encode($mUser);
            //send mtoUser (global!) to javascript
            echo"<script>var mUser = " . $userJson . ";</script>";
            echo"<script>var baseUrl = '" . BASE_URL . "';</script>";
        ?>       
		
	</head>
	<body>
		<div id="navMain">
			<nav class="navbar navbar-inverse">
			  <div class="container-fluid">
				<div class="navbar-header">
				  <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#myNavbar">
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>
					<span class="icon-bar"></span> 
				  </button>
				  <a class="navbar-brand" href="<?php echo BASE_URL?>">WebSiteName</a>
				</div>
				<div id="myNavbar" role = "navigation" class="collapse navbar-collapse">
					<ul class="nav navbar-nav topNav">
						<li><a id="home" href="#">Home</a></li>
                        
						<li class="dropdown">
							<a class="dropdown-toggle" data-toggle="dropdown" href="#">Opts
							<span class="caret"></span></a>
							<ul class="dropdown-menu">
                                <!-- add .dropodown to these to maintain styling -->
                                <li><a class="dropdown" id = "1-1" href="#">Page 1-1</a></li>
                                <li><a class="dropdown" id = "1-2" href="#">Page 1-2</a></li>
                                <li><a class="dropdown" id = "1-3" href="#">Page 1-3</a></li> 
							</ul>
						</li>
						<li><a href="#" id="p1">p1</a></li> 
						<li><a href="#" id="p3">Page 3</a></li>
					</ul>
					<ul class="nav navbar-nav navbar-right">
						<li id="signUpLi" class="hidden"><a href="#" id="signUp"><span class="glyphicon glyphicon-user"></span> Sign Up</a></li>
                        <li class="dropdown hidden" id="userDropdown">
                            <a id="menuUsername" class="dropdown-toggle" data-toggle="dropdown" href="#">Username
                            <span class="caret"></span></a>
                            <ul class="dropdown-menu">
                                <li><a href="#" id="mLogoff">Logoff</a></li>                            
                            </ul>
                        </li>
						<li id="loginLi" class="hidden"><a href="#"><span class="glyphicon glyphicon-log-in"></span> Login</a></li>
					</ul>
				</div>
			  </div>
			</nav>
		</div>
        
        <div id="modal"></div>
        <div id="contentMain">
		</div>
        <div id="spinnerWrapper">
            <div id="spinner">
            </div>
        </div> 
        <div class='popupPanel'>
            <div id='pPanelText' class="alert alert-success" role="alert">Successfully longer message here</div>
        </div>
		


        <script data-main="/assets/js/require_main.js" src="/assets/js/vendor/require.js"></script>		

        <!--
        <script src="/build/compiled.js"></script>
        -->         
    
    </body>

</html>
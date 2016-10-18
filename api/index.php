<?php
session_start();
require "lib/Slim/Slim.php";    
require "config/config.php";
require "phpClasses/class.dataconnecter.php";
require "phpClasses/class.person.php";
require "phpClasses/class.logger.php";
require "phpClasses/class.layer.php";
require "phpClasses/class.map.php";
require "phpClasses/class.mapUtil.php";
require "phpClasses/geoPHP-master/geoPhp.inc";

\Slim\Slim::registerAutoloader();

// create new Slim instance
$app = new \Slim\Slim();


//route the requests . . . 
$app->get('/users/:id', 'getUser');
$app->get('/users/', 'getAllUsers');
$app->get('/login/','login');
$app->get("/logoff/", "logoff");

$app->post('/users/', 'addUser');
$app->post('/users/:id', 'updateUser');

$app->get('/maps/:id', 'getMap');


$app->get('/test/:id', 'getTest');
$app->put('/test/:id',  'updateTest');
$app->post('/test/', 'addTest');

$app->post('/layers/', 'addLayer');
$app->put('/layers/:id', 'updateLayer');

function addLayer() {
	$app = \Slim\Slim::getInstance();
	$params = json_decode($app->request->getBody(), true);
	$response['params'] = $params;
	foreach($params as $key=>$value){
		$response[$key] = $value;
	}    
    
    $response['newLayerId'] = Layer::createLayer(1);

    
    print json_encode($response);
    
}

function updateLayer ($id) {
	$app = \Slim\Slim::getInstance();
	//this is the key . . .it's json object coming across
	$params = json_decode($app->request->getBody(), true);
    $response['$id'] = $id;
	$response['params'] = $params;
	foreach($params as $key=>$value){
		$response[$key] = $value;
	}
    
    $iLayer = new Layer($id);
    $response['origLayer'] = $iLayer->dumpArray();
    $iLayer->geoJson = $params['geoJson'];
    
    $response['gJ'] = $params['geoJson'];
    $response['update'] = $iLayer->updateLayerJson(json_encode($iLayer->geoJson));
    
    //return the layer
    $rLayer = new Layer($id);
    $response['rLayer'] = $rLayer->dumpArray();
	
	print json_encode($response);
}

function getMap($id){
	//this has to come across as json so it will map to the Backbone model
    $response = array();
    //$response['layers'] = array();
	$iMap = new Map($id);    
    $response['mapData'] = $iMap->dumpArray();
    //get the layers
    //explode the layers string
    $layersArr = explode(",", $iMap->getLayers());
    //iterate through each layer and add layer data to response . . . 
    //TODO handle the case where the layer has been deleted or is corrupt
    foreach($layersArr as $iLayerIndex) {
        $iLayer = new Layer($iLayerIndex);
        //array_push($response['layers'], $iLayer->dumpArray());
        $response['layersData'][$iLayerIndex] = $iLayer->dumpArray();
    }
    print json_encode($response);	
}


function addTest() {
	$app = \Slim\Slim::getInstance();
	$params = json_decode($app->request->getBody(), true);
	$response['params'] = $params;
	foreach($params as $key=>$value){
		$response[$key] = $value;
	}	
	print json_encode($response);    
}

function getTest($id) {
    $response = array();
    $response['id'] = $id;
    $response['name'] = "Chuck";
    print(json_encode($response));
}

function updateTest() {
	$app = \Slim\Slim::getInstance();
	//this is the key . . .it's json object coming across
	$params = json_decode($app->request->getBody(), true);
    $response['id'] = $params['id'];
    
	$response['params'] = $params;
	foreach($params as $key=>$value){
		$response[$key] = $value;
	}
    
   
	
	print json_encode($response);
    
    $app->response->setStatus(201);
 
}


function login(){ 
	$app = \Slim\Slim::getInstance();
    $username = $app->request->params('username');
    $pwd = $app->request->params('password');
    $result = Logger::check_login($username, $pwd);
    if($result['pass'] == 1){
        //this will persist user data if they refresh
        $_SESSION['mUserId'] = $result['id'];
        $_SESSION['mUserKey'] = $result['key'];
        $_SESSION['mUsername'] = $result['username'];
        $_SESSION['mUserPerm'] = $result['permission'];    
    }
    
	print json_encode($result);
}

function addUser() {
	$app = \Slim\Slim::getInstance();
	$params = $app->request->params();
	$response = array();
	$response['params'] = $params;
	$response['session'] = $_SESSION;
	if($_SESSION['miffUserPerm'] > 6) {
		//add user to db
		$response['success'] = logger::createUser($params['pwd'], $params['name'], $params['email'], $params['phone'], $params['perm']);
	}	
	print json_encode($response['success']);
}
function getAllUsers(){
	$response = logger::getAllUsers();
	print $response;
}



function getUser($id){
	$iPerson = new Person($id);
	print $iPerson->dumpJson();
}


function logoff(){
	$app = \Slim\Slim::getInstance();
    $id = $app->request->params('mUserId');
    $key = $app->request->params('mUserKey');
    $result = Logger::logoff($id, $key);
    //only reset if user logged off successfully with id and key,
    //otherwise, anyone could log anyone off through the api
    if($result['keychangesuccess'] == true){
        $_SESSION['mUserId'] = 0;
        $_SESSION['mUserKey'] = 0;
        $_SESSION['mUsername'] = "Guest";
        $_SESSION['mUserPerm'] = 0;     
    };
    print json_encode($result);
}

function updateUser($id){
	$app = \Slim\Slim::getInstance();
    $params = $app->request->params();
    //TODO validate
	$response = array();
	$response['params'] = $params;
	if($_SESSION['miffUserPerm'] > 6) {
		//check if there's a pwd param
		if(array_key_exists("pwd", $params)){
			$response['hasPwd'] = true;
			$response['success'] = logger::updateUserPassword($id, $params['pwd']);
			//update with password
		}else{
			$response['hasPwd'] = false;
			//update without password
			$success = logger::updateUser($params['id'], $params['username'], $params['email'], $params['phone'], $params['permission']);
			$response['success'] = $success;
		}
		
	}

	print json_encode($response['success']);
}

$app->run();

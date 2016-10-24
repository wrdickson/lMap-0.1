<?php
/*
class.map.php

dependencies: 
    -geoPHP object for static functions
    -DataConnecter object that will instantiate and return a new PDO (static function)
*/
class Map {
    private $id;
    private $envelope;
    private $centroid;
    private $area;
    private $zoom;
    private $owner;
    private $name;
    private $description;
    private $layers;
    private $added;
    private $modified;
    
    public function tmpUpdate() {
        //used when we have a map, but just need to calculate envelope, centroid and area . . .
        $calc = $this->calculateEnvelopeCentroidArea();
        $id = $this->id;
        $env = $calc['envelope'];
        $cen = $calc['centroid'];
        $ar = $calc['area'];
        $pdo = DataConnecter::getConnection(); 
        $stmt = $pdo->prepare("UPDATE maps SET envelope = GeomFromText(:env), centroid = GeomFromText(:cent), area = :area, modified = NOW() WHERE id = :id");
        $stmt->bindParam(":env", $env, PDO::PARAM_STR);
        $stmt->bindParam(":cent", $cen, PDO::PARAM_STR);
        $stmt->bindParam(":area", $ar, PDO::PARAM_STR);
        $stmt->bindParam(":id", $id, PDO::PARAM_INT);
        $result = $stmt->execute();
        if ($result == true) {
            return true;
        } else {
            return false;
        }        
    }
    
    public function __construct($id){
          $pdo = DataConnecter::getConnection();
            $stmt = $pdo->prepare("SELECT id , AsText( envelope ) AS envelope, AsText( centroid ) AS centroid, area, zoom, owner, name , description , layers, added , modified FROM maps WHERE id = :id");
            $stmt->bindParam(":id",$id,PDO::PARAM_INT);
            $stmt->execute();
            while($obj = $stmt->fetch(PDO::FETCH_OBJ)){
                $this->id = $obj->id;
                // db stores envelope as wkt, we want it in geoJson
                try {
                    $this->envelope = $this->wktToJson($obj->envelope);
                } catch (Exception $e) {
                    $this->envelope = 0;
                }
                try {
                    $this->centroid = $this->wktToJson($obj->centroid);
                } catch (Exception $e) {
                    $this->centroid = 0;
                }
                $this->area = $obj->area; 
                $this->zoom = $obj->zoom;
                $this->owner = $obj->owner;
                $this->name = $obj->name;
                $this->description = $obj->description;
                $this->layers = $obj->layers;
                $this->added = $obj->added;
                $this->modified = $obj->modified;
            }
            //now calculate centroid/envelope/area
            $response = $this->calculateEnvelopeCentroidArea();
            $a = geoPHP::load($response['envelope']);
            //handle empty geojson or just a point
            if($a != true) {
                $this->envelope = 0;
            } else {
                $this->envelope = $a->out('json');
            }
            $b = geoPHP::load($response['centroid']);
            if($b != true) {
                $this->centroid = 0;
            } else {
                $this->centroid = $b->out('json');
            };
            $this->area = $response['area'];
            //$this->test = $response;
            
            //debug  we are hitting the db too many times here
            //BUT  we want to update the centroid/envelope/area every time we load the map
            //  since the geoJson data on the associated arrays may have changed
            $this->tmpUpdate();
    }
    
    public function calculateEnvelopeCentroidArea() {
        $response = array();
        $features = array();
        $features['type'] = "FeatureCollection";
        $features['features'] = array();
        $pdo = DataConnecter::getConnection();
        //build an array of the layers
        $layers = explode(",", $this->layers);
        foreach ($layers as $layer) {
            $iLayer = new Layer($layer);
            $iJson = $iLayer->geoJson;
            $iso = json_decode($iJson, true);
            foreach($iso['features'] as $ii) {
                array_push($features['features'], $ii);
            }
        };
        $response['envelope'] = MapUtil::calculateEnvelopeJson2Wkt(json_encode($features));
        $response['centroid'] = MapUtil::calculateCentroidJson2Wkt(json_encode($features));
        $response['area'] = MapUtil::calculateAreaFromEnvelopeWkt($response['envelope']);
        return $response;
    }
    
    public function dumpArray(){
        $mapArr = array();
        $mapArr['id'] = $this->id; 
        $mapArr['envelope'] = json_decode($this->envelope, true);   
        $mapArr['centroid'] = json_decode($this->centroid, true);       
        $mapArr['area'] = $this->area;
        $mapArr['zoom'] = $this->zoom;
        $mapArr['owner'] = $this->owner;
        $mapArr['name'] = $this->name;
        $mapArr['description'] = $this->description;
        $mapArr['layers'] = $this->layers;
        $mapArr['added'] = $this->added;
        $mapArr['modified'] = $this->modified;
        //$mapArr['test'] = $this->test;
        return $mapArr;
    }
    
    public function dumpJson(){
        return stripslashes(json_encode($this->dumpArray()));    
    }
    
    private function wktToJson($wkt){
        try {
            $geom = geoPHP::load($wkt,'wkt');
            if ($geom) {
                $xx = $geom->out('json');
            } else {
                $xx = 0;
            }
        } catch (Exception $e) {
            $xx = 0;
        }
      return $xx; 
    }
    
    //get set . . . 
    public function getId(){
        return $this->id;
    }
    
    public function getOwner(){
        return $this->owner;
    }
    
    
    public function setOwner($ownerId){
        $this->owner = $ownerId;
        //TODO db update    
    }
    
    public function getName(){
        return $this->name;
    }
    
    public function setName($name){
        $this->name = $name;
        //TODO db update
    }
    
    public function getdescription(){
        return $this->description;
    }
    
    public function setdescription($description){
        $this->description = $description;
        //TODO db update
    }

    public function getLayers(){
        return $this->layers;
    }
    
    public function getCentroid(){
        return $this->centroid;
    }
    
    public function getEnvelope(){
        return $this->envelope;
    }
    
    public function getArea(){
        return $this->area;
    }
    
    public function getZoom(){
        return $this->zoom;    
    }
    
    public function getType(){
        return $this->type;    
    }
    
    public function getMapJson(){
        return $this->mapJson;
    }
    
    public function getHasLegend(){
        return $this->mapHasLegend;
    }
    
    public function getLegend(){
        return $this->mapLegend;   
    }
    
    public function getDateAdded(){
        return $this->dateAdded;
    }
    
    public function getDateModified(){
        return $this->dateModified;
    }
    
    public function updateDefaultZoom($newDefaultZoom){
        //TODO validate . . .
        $mapId = $this->id;
        $pdo = DataConnecter::getConnection();
        
        $stmt = $pdo->prepare("UPDATE maps SET zoom = :mapZoom, modified = NOW() WHERE id = :id");
        $stmt->bindParam(":mapZoom", $newDefaultZoom, PDO::PARAM_INT);
        $stmt->bindParam(":id", $this->id, PDO::PARAM_INT);
        $result = $stmt->execute();        
        //only update locally if the db update is successful
        if($result == true){
            $this->zoom = $newDefaultZoom;
            return true;
        }else{
            return false;
        }                
    }
    
    public function updateMapdescription($newMapdescription){
        //TODO validate . . .
        $newMapdescription = stripslashes($newMapdescription);
        $mapId = $this->id;
        $pdo = DataConnecter::getConnection();
        $stmt = $pdo->prepare("UPDATE maps SET description = :mapdescription, modified = NOW() WHERE id = :id");
        $stmt->bindParam(":mapdescription", $newMapdescription, PDO::PARAM_STR);
        $stmt->bindParam(":id", $this->id, PDO::PARAM_INT);
        $result = $stmt->execute();        
        //only update locally if the db update is successful
        if($result == true){
            $this->description = $newMapdescription;
            return true;
        }else{
            return false;
        }        
    }
    
    public function updateMap($mapData){
    
    }
    
    public function updateMapName($newMapName){
        //TODO validate . . .
        $newMapName = stripslashes($newMapName);
        $mapId = $this->id;
        $pdo = DataConnecter::getConnection();
        $stmt = $pdo->prepare("UPDATE maps SET name = :mapName, modified = NOW() WHERE id = :id");
        $stmt->bindParam(":mapName", $newMapName, PDO::PARAM_STR);
        $stmt->bindParam(":id", $this->id, PDO::PARAM_INT);
        $result = $stmt->execute();        
        //only update locally if the db update is successful
        if($result == true){
            $this->name = $newMapName;
            return true;
        }else{
            return false;
        }
    }
}


?>
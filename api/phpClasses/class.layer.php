<?php
class Layer {
    public $id;
    public $owner;
    public $name;
    public $description;
    public $geoJson;
    public $dateCreated;
    public $dateModified;
    public $envelope;
    public $centroid;
    public $tags;
    
    public function __construct ($id) {
        $pdo = DataConnecter::getConnection();        
        $stmt = $pdo->prepare("SELECT id,owner, name, description, geoJson, dateCreated, dateModified, AsText( envelope ) AS envelope, AsText( centroid ) AS centroid, tags FROM layers WHERE id = :id");
        $stmt->bindParam(":id",$id,PDO::PARAM_INT);
        $stmt->execute();
        while($obj = $stmt->fetch(PDO::FETCH_OBJ)){
            $this->id = $obj->id;
            $this->owner = $obj->owner;
            $this->name = $obj->name;    
            $this->description = $obj->description;
            $this->geoJson = $obj->geoJson;
            $this->geoJson = json_decode($obj->geoJson, true);
            $this->geoJson = json_encode($this->geoJson);
            $this->dateCreated = $obj->dateCreated;
            $this->dateModified = $obj->dateModified;
            // db stores envelope as wkt, we want it in geoJson
            //also, handle the case of an empty feature collection
            
            $this->envelope = $this->wktToJson($obj->envelope);

            // db stores centroid as wkt, we want it in geoJson
            $this->centroid = $this->wktToJson($obj->centroid);
            $this->tags = $obj->tags;
     
        }
    }
    
    public static function createLayer ($owner) {
        $pdo = DataConnecter::getConnection();
        $geoJson = '{"features":[],"type":"FeatureCollection"}';
        $name = "layer";
        $description = "descriptionription";
         $stmt = $pdo->prepare("INSERT INTO layers (owner, name, description, geoJson, dateCreated, dateModified) VALUES (:owner, :name, :description, :geoJson, NOW(), NOW())");
        $stmt->bindParam(":owner", $owner, PDO::PARAM_STR);
        $stmt->bindParam(":geoJson", $geoJson, PDO::PARAM_STR);
        $stmt->bindParam(":name", $name, PDO::PARAM_STR);
        $stmt->bindParam(":description", $description, PDO::PARAM_STR); 
       // $stmt = $pdo->prepare("INSERT INTO layers (owner) VALUES (1)");
        $ii = $stmt->execute();
        $insertId = $pdo->lastInsertId();
        return $insertId;        
    }
    
    public function dumpArray() {
        $layerArr = array();
        $layerArr['id'] = $this->id;
        $layerArr['description'] = $this->owner;
        $layerArr['name'] = $this->name;
        $layerArr['owner'] = $this->owner;
        $layerArr['geoJson'] = json_decode($this->geoJson, true);
        $layerArr['dateCreated'] = $this->dateCreated;
        $layerArr['dateModified'] = $this->dateModified;
        $layerArr['envelope'] = json_decode($this->envelope, true);
        $layerArr['centroid'] = json_decode($this->centroid, true);
        $layerArr['tags'] = $this->tags;
        return $layerArr;       
    }
    
    public static function updateLayer ($layer) {
            //TODO - validate user
            $layerId = (int) $layer['id'];
            $owner = (int) $layer['owner'];
            $name = $layer['name'];
            $description = $layer['description'];
            //it's named 'geoJson', but it's a php array in this context
            $geoJson = json_encode($layer['geoJson']);
            //calculate envelope (wkt)
            $envelope = MapUtil::calculateEnvelopeJson2Wkt(json_encode($layer['geoJson']));
            $centroid = MapUtil::calculateCentroidJson2Wkt(json_encode($layer['geoJson']));
            $tags = $layer['tags'];
            $pdo = DataConnecter::getConnection();
            //handle slashes??
            //handle empty layer where envelope and centroid return null
            if($envelope != null && $centroid != null) {
                $stmt = $pdo->prepare("UPDATE layers SET owner = :owner, name = :name, description = :description, geoJson = :geoJson, envelope = GeomFromText(:env), centroid = GeomFromText(:cent), dateModified = NOW(), tags = :tags WHERE id = :id");
                $stmt->bindParam(":description", $description, PDO::PARAM_STR);
                $stmt->bindParam(":name", $name, PDO::PARAM_STR);
                $stmt->bindParam(":owner", $owner, PDO::PARAM_STR);
                $stmt->bindParam(":geoJson", $geoJson, PDO::PARAM_STR);
                $stmt->bindParam(":env", $envelope, PDO::PARAM_STR);
                $stmt->bindParam(":cent", $centroid, PDO::PARAM_STR);
                $stmt->bindParam(":id", $layerId, PDO::PARAM_INT);
                $stmt->bindParam(":tags", $tags, PDO::PARMA_STR);
                $result = $stmt->execute();
                if ($result == true) {
                    return true;
                } else {
                    return false;
                }
            } else {
                //here we put null into centroid and envelope, since it's an empty (or error??) geoJson object
                $stmt = $pdo->prepare("UPDATE layers SET owner = :owner, name = :name, description = :description, geoJson = :geoJson, envelope = null, centroid = null, tags = :tags, dateModified = NOW() WHERE id = :id");
                $stmt->bindParam(":description", $description, PDO::PARAM_STR);
                $stmt->bindParam(":name", $name, PDO::PARAM_STR);
                $stmt->bindParam(":owner", $owner, PDO::PARAM_STR);
                $stmt->bindParam(":geoJson", $geoJson, PDO::PARAM_STR);
                $stmt->bindParam(":id", $layerId, PDO::PARAM_INT);
                $stmt->bindParam(":tags", $tags, PDO::PARAM_STR);
                $result = $stmt->execute();
                if ($result == true) {
                    return true;
                } else {
                    return false;
                }
            }
    }    
    
    public function updateLayerJson ($geoJson) {
        //validate geoJson
        $j = 1;
        if ($j == 1) {
            //calculate envelope (wkt)
            $layerId = $this->id;
			//note: this only sets envelope and centroid on the layer, not the map
            $envelope = MapUtil::calculateEnvelopeJson2Wkt($geoJson);
            $centroid = MapUtil::calculateCentroidJson2Wkt($geoJson);
            $pdo = DataConnecter::getConnection();
            //handle slashes??
            $stmt = $pdo->prepare("UPDATE layers SET geoJson = :geoJson, envelope = GeomFromText(:env), centroid = GeomFromText(:cent), dateModified = NOW() WHERE id = :id");
            $stmt->bindParam(":geoJson", $geoJson, PDO::PARAM_STR);
            $stmt->bindParam(":env", $envelope, PDO::PARAM_STR);
            $stmt->bindParam(":cent", $centroid, PDO::PARAM_STR);
            $stmt->bindParam(":id", $layerId, PDO::PARAM_INT);
            $result = $stmt->execute();
            if ($result == true) {
                return true;
            } else {
                return false;
            }
        } else {
            return NULL;
        }
    }
    
    private function wktToJson($wkt){
        $geom = geoPHP::load($wkt,'wkt');
        //handle an empty feature collection
        if ($geom == false) {
            return null;
        }
        $json = $geom->out('json');
 
        return $json;
    }    
}
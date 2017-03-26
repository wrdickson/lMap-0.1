
<?php
/*
class.mapUtil.php

dependencies: 
	-geoPHP object for static functions
	-DataConnector object that will instantiate and return a new PDO (static function)

*/
Class MapUtil {
/* 
return all maps 
*/
public static function getAllMaps(){
	$returnArr = array();
	$pdo = DataConnecter::getConnection();
	$stmt = $pdo->prepare("SELECT map_id, map_name, map_desc, map_area, AsText(map_envelope) AS map_envelope, AsText(map_centroid) AS map_centroid, map_json, map_owner FROM maps");
	$stmt->execute();
	while($obj = $stmt->fetch(PDO::FETCH_OBJ)){
		$iArr = array();
		$iArr['id'] = $obj->map_id;
		$iArr['name'] = $obj->map_name;
		$iArr['desc'] = $obj->map_desc;
        $iArr['area'] = $obj->map_area;
		$iArr['mapJson'] = json_decode($obj->map_json, true);
		$iArr['envelope'] = $obj->map_envelope;
		//convert the envelope to json: 
		$geoEnv = geoPHP::load($obj->map_envelope, "wkt");
		$iArr['envelopeJson'] = $geoEnv->out("json");
		$geoCent = geoPHP::load($obj->map_centroid, "wkt");
		$iArr['centroid'] = json_decode($geoCent->out("json"), true);
		$iArr['owner'] = $obj->map_owner;
		array_push($returnArr, $iArr);
	}
	
	return $returnArr;

}

/* 
return a user's maps 
*/
public static function getUserMaps( $userId ){
	$returnArr = array();
	$pdo = DataConnecter::getConnection();
	$stmt = $pdo->prepare("SELECT id, name, description, area, AsText(envelope) AS envelope, AsText(centroid) AS centroid, owner FROM maps WHERE owner = :uId");
	$stmt->bindParam(":uId",$userId,PDO::PARAM_INT);
	$stmt->execute();
	while($obj = $stmt->fetch(PDO::FETCH_OBJ)){
		$iArr = array();
		$iArr['id'] = $obj->id;
		$iArr['name'] = $obj->name;
		$iArr['description'] = $obj->description;
        $iArr['area'] = $obj->area;
		$iArr['envelope'] = $obj->envelope;
		//convert the envelope to json: 
		$geoEnv = geoPHP::load($obj->envelope, "wkt");
		if ($obj->envelope != NULL){
			$iArr['envelopeJson'] = json_decode($geoEnv->out("json"), true);
		} else {
			$iArr['envelopeJson'] = null;	
		}
		//$geoCent = geoPHP::load($obj->centroid, "wkt");
		//$iArr['centroid'] = json_decode($geoCent->out("json"), true); 
		//$iArr['owner'] = $obj->owner;
		array_push($returnArr, $iArr);
	}
	return $returnArr;
}
/*
Adds a new map to the database using a geo json object .. .
@param int $owner UserId of the creater
@param string $json A geojson object of points, polylines, and/or polygons
@param string $name Publicly visible name of the map
@param string $desc Publicly visible description of the map
@return int New id from the maps table, null on failure
*/
public static function insertMap($owner, $json, $name, $desc){
	//calculate centroid
	$wktCentroid = MapUtil::calculateCentroidJson2Wkt($json);
	//calculate envelope
	$wktEnvelope = MapUtil::calculateEnvelopeJson2Wkt($json);
	//insert
	$pdo = DataConnecter::getConnection();
	$stmt = $pdo->prepare("INSERT INTO maps (map_envelope, map_centroid, map_owner, map_json, map_name, map_desc, date_added, date_modified) VALUES ( GeomFromText(:envelope), GeomFromText(:centroid), :owner, :json, :name, :desc, NOW(), NOW() )");
	$stmt->bindParam(":envelope",$wktEnvelope,PDO::PARAM_STR);
	$stmt->bindParam(":centroid",$wktCentroid,PDO::PARAM_STR);
	$stmt->bindParam(":owner",$owner,PDO::PARAM_INT);
	$stmt->bindParam(":json",$json,PDO::PARAM_STR);
	$stmt->bindParam(":name",$name,PDO::PARAM_STR);
	$stmt->bindParam(":desc",$desc,PDO::PARAM_STR);
	$k = $stmt->execute();
	$insertId = $pdo->lastInsertId();
	return $insertId;		
}

//@param $envelope -- a wkt polygon (generated from geoPHP->envelope();
public static function calculateAreaFromEnvelopeWkt($envelope){
    $k = geoPHP::load($envelope);
    //empty feature or just a point
    if($k == false) {
        return 0;
    }
    $envelopeJson = $k->out('json');
    $env = json_decode($envelopeJson, true);
    $points = array();
    $i = 0;
    foreach($env['coordinates'][0] as $iterate){
        $points[$i][0] = $iterate[0];
        $points[$i][1] = $iterate[1];
        $i++;
    }
    $lat1 = $points[0][1];
    $lng1 = $points[0][0];
    $lat2 = $points[1][1];
    $lng2 = $points[1][0];
    $distance1 = mapUtil::vincentyGreatCircleDistance($lat1,$lng1,$lat2,$lng2);

    $lat1 = $points[1][1];
    $lng1 = $points[1][0];
    $lat2 = $points[2][1];
    $lng2 = $points[2][0];
    $distance2 = mapUtil::vincentyGreatCircleDistance($lat1,$lng1,$lat2,$lng2);

    $lat1 = $points[3][1];
    $lng1 = $points[3][0];
    $lat2 = $points[4][1];
    $lng2 = $points[4][0];
    $distance4 = mapUtil::vincentyGreatCircleDistance($lat1,$lng1,$lat2,$lng2);

    $avgLngDiff = ($distance2 + $distance4)/2;

    $area = $avgLngDiff * $distance1;
    $apprxAreaKm2 = $area/100000;
    
    return $apprxAreaKm2;
}

/*
use the geoPHP class to calculate the centroid of a geoJson collection
@param string $json - The geoJson string
@return string  - WKT string of the centroid point
*/
public static function calculateCentroidJson2Wkt($json){
	$mJson = geoPHP::load($json, "json");
    //handle an empty geojson object 
    if($mJson != true) {
        return null;
    };
	$mCentroid = $mJson->centroid();
	$wktCentroid = $mCentroid->out('wkt');
	return $wktCentroid;	
}
/*
@param float $lat1
@aparam float lng1
@param float $lat2
@param float $lng2
@param string $miles (K = km, M = miles, N = nautical miles)
*/
public static function calculateDistance($lat1, $lon1, $lat2, $lon2, $unit) {

  $theta = $lon1 - $lon2;
  $dist = sin(deg2rad($lat1)) * sin(deg2rad($lat2)) +  cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * cos(deg2rad($theta));
  $dist = acos($dist);
  $dist = rad2deg($dist);
  $miles = $dist * 60 * 1.1515;
  $unit = strtoupper($unit);

  if ($unit == "K") {
    return ($miles * 1.609344);
  } else if ($unit == "N") {
      return ($miles * 0.8684);
    } else {
        return $miles;
      }
}


/*
use the geoPHP class to calculate the envelope of a geoJson collection
@param string $json - The geoJson string
@return string  - WKT string of the envelope polygon
*/
public static function calculateEnvelopeJson2Wkt($json){
	$mJson = geoPHP::load($json, "json");
    //handle an empty geojson object
    if ($mJson != true) {
        return null;
    }
	$mEnvelope = $mJson->envelope();
	$wktEnvelope = $mEnvelope->out('wkt');
	return $wktEnvelope;	
}

/*
use the geoPHP class to calculate the envelope of a wkt geometry
@param string $wkt - The wkt string
@return string  - WKT string of the envelope polygon
*/
public static function calculateEnvelopeWkt2Wkt($wkt){
	$mWkt = geoPHP::load($wkt, "wkt");
	$mEnvelope = $mWkt->envelope();
	$wktEnvelope = $mEnvelope->out('wkt');
	return $wktEnvelope;	
}

public static function createBlankMap($owner, $centroid, $zoom, $name, $description, $layers){
	//TODO validate
	$c = geoPHP::load(json_encode($centroid), "json");
    $centroidWkt = $c->out('wkt');
	$pdo = DataConnecter::getConnection();
	$stmt = $pdo->prepare("INSERT INTO maps (zoom, centroid, owner, name, description, layers, added, modified) VALUES ( :zoom, GeomFromText(:centroid), :owner, :name, :desc, :layers, NOW(), NOW() )");
	$stmt->bindParam(":zoom",$zoom,PDO::PARAM_INT);
    $stmt->bindParam(":centroid",$centroidWkt,PDO::PARAM_STR);
	$stmt->bindParam(":owner",$owner,PDO::PARAM_INT);
	$stmt->bindParam(":name",$name,PDO::PARAM_STR);
	$stmt->bindParam(":desc",$description,PDO::PARAM_STR);
    $stmt->bindParam(":layers",$layers,PDO::PARAM_STR);
	$k = $stmt->execute();
	$insertId = $pdo->lastInsertId();
	return $insertId;	
}

/*
@param string $polygonWkt - a wkt polygon of the viewport bounds
@return array - 
*/
public static function getMapsWithinBounds($polygonWkt){
	
	$returnArr = array();
	$pdo = DataConnecter::getConnection();
    //this returns maps whose minimum bounding rectangle is entirely within the viewport params
	$stmt = $pdo->prepare("SELECT map_id, map_name, map_desc, map_area, AsText(map_envelope) AS map_envelope, AsText(map_centroid) AS map_centroid, map_json, map_owner FROM maps WHERE MBRContains(GeomFromText(:g1), map_envelope)");
    //this returns maps whose centroid is within the viewport parms
    //$stmt = $pdo->prepare("SELECT map_id, map_name, map_desc, map_area, AsText(map_envelope) AS map_envelope, AsText(map_centroid) AS map_centroid, map_json, map_owner FROM maps WHERE MBRContains(GeomFromText(:g1), map_centroid)");
	$stmt->bindParam(":g1",$polygonWkt,PDO::PARAM_STR);
	$stmt->bindParam(":g1",$polygonWkt,PDO::PARAM_STR);
	$stmt->execute();
	while($obj = $stmt->fetch(PDO::FETCH_OBJ)){
		$iArr = array();
		$iArr['id'] = $obj->map_id;
		$iArr['name'] = $obj->map_name;
		$iArr['desc'] = $obj->map_desc;
        $iArr['area'] = $obj->map_area;
		$iArr['mapJson'] = json_decode($obj->map_json, true);
		$iArr['envelope'] = $obj->map_envelope;
		//convert the envelope to json: 
		$geoEnv = geoPHP::load($obj->map_envelope, "wkt");
		$iArr['envelopeJson'] = $geoEnv->out("json");
		$geoCent = geoPHP::load($obj->map_centroid, "wkt");
		$iArr['centroid'] = json_decode($geoCent->out("json"), true);
		$iArr['owner'] = $obj->map_owner;
		array_push($returnArr, $iArr);
	}
	
	return $returnArr;
		
}

/*
Converts a gpx string to geoJson.  "name" and "desc" well become "name" and "desc" properties
@param string $gpx - An xml string in gpx format: accepts wpt,trk TODO polygon
@return string - a geoJson FeatureCollection
*/
public static function gpxToJson($gpx){
	//build the geoJson object
	$mArr = array();
	$mArr['type'] = "FeatureCollection";
	$mArr['features'] = array();
	$mArr['properties'] = array();
	//get the gpx children
	foreach(get_object_vars($xml) as $i=>$v){
		//exclude "wpt" "trk" "rte"  ... and others???
		if($i!="@attributes" & $i!="wpt" & $i!="trk" & $i!="rte"){
			$mArr['properties'][$i] = (string)$v;
		}
	}
	//get the waypoints
	foreach($xml->wpt as $wpt){
		//build an array first, then json encode
		$arr = array();
		$arr['type'] = "Feature";
		$arr['geometry'] = array();
		$geoArr = array();
		$geoArr['type'] = "Point";
		$geoArr['coordinates'] = array();
		$coordArr = array((float)$wpt['lon'], (float)$wpt['lat']);
		$geoArr['coordinates'] = $coordArr;
		$arr['geometry'] = $geoArr;
		$arr['properties'] = array();
		//iterate through the children, making them "properties"
		foreach(get_object_vars($wpt) as $i=>$v){
			if($i != "@attributes"){
				$arr['properties'][$i] = (string)$v;
			}
		}
		array_push($mArr['features'], $arr);	 
	}				
	//get the tracks
	foreach($xml->trk as $trk){
		//build an array first, then json encode	
		$arr = array();
		$arr['type'] = "Feature";
		$arr['geometry'] = array();
		$geoArr = array();	
		$geoArr['type'] = "LineString";
		$geoArr['coordinates'] = array();
		//iterate the trksegs
		foreach ($trk->trkseg as $trkseg){
			foreach ($trkseg->trkpt as $trkpt){
				$geoArr['coordinates'][] = array((float)$trkpt['lon'], (float)$trkpt['lat']);
			}
		}
		$arr['geometry'] = $geoArr;
		$arr['properties'] = array();
		//iterate through the children, making them "properties"
		foreach(get_object_vars($trk) as $i=>$v){
			if($i != "trkseg"){
				$arr['properties'][$i] = (string)$v;
			}
		}
		array_push($mArr['features'], $arr);	
	}

	$mapJson = json_encode($mArr);
	
	return $mapJson;	
	
}

/*  NOTE: this is the newer ftn (12/13)
*   generate a gpx string from a geoJson string 
*   @param string $gpx - the gpx string
*   @param bool $polygonTransform - whether or not to create polygons from closed lines
*   @return - string - a geoJson FeaturesCollection [?]
*/
public static function gpxToGeoJson($gpx, $polygonTransform){
    $gpx = new SimpleXMLElement($gpx);
    $finalArray = array();
    //waypoints
    foreach($gpx->wpt as $wpt){
        //var_dump($wpt);
        $iLat = $wpt['lat'];
        $iLng = $wpt['lon'];
        $iName = $wpt->name;
        $iDesc = $wpt->desc;
        $iArr = array();
        $iArr['type'] = "Feature";
        $iArr['geometry'] = array();
        $iArr['geometry']['type'] = "Point";
        $iArr['geometry']['coordinates'] = array();
        array_push($iArr['geometry']['coordinates'],(float)$iLng);
        array_push($iArr['geometry']['coordinates'],(float)$iLat);
        $iArr['properties']['name'] = (string)$wpt->name;
        $iArr['properties']['desc'] = (string)$wpt->desc;
        array_push($finalArray, $iArr);
    }
    //tracks
    foreach($gpx->trk as $trk){
        $iArr = array();
        $iArr['type'] = "Feature";
        $iArr['geometry']['type'] = "LineString";
        $iArr['properties']['name'] = (string)$trk->name;
        $iArr['properties']['desc'] = (string)$trk->desc;
        //geometry
        $iArr['geometry']['coordinates'] = array();
        foreach($trk->trkseg->trkpt as $trkpt){
            //echo"got one <br/>";
            $iLngLat = array();
            array_push($iLngLat, (float)$trkpt['lon']);
            array_push($iLngLat, (float)$trkpt['lat']);
            var_dump($iLngLat);
            array_push($iArr['geometry']['coordinates'],$iLngLat);       
        }
        $count = count($iArr['geometry']['coordinates']);
        $isClosed = false;
        if($iArr['geometry']['coordinates'][0] == $iArr['geometry']['coordinates'][$count -1]){
          //echo "is closed <br/>";
          $isClosed = true;  
        }
        //if it's closed and user wants it, transform it into a polygon
        if($isClosed == true && $polygonTransform == true){
           $iArr['geometry']['type'] = "Polygon";
           $tArr = array();
           array_push($tArr, $iArr['geometry']['coordinates']);
           $iArr['geometry']['coordinates'] = $tArr; 
        }
       array_push($finalArray, $iArr);    
    }
    return json_encode($finalArray);
}

public static function json2gpx($json, $closePolygons){
    $jArr = json_decode($json,true);
    $gpx = new SimpleXmlElement('<?xml version="1.0" encoding="UTF-8"?><gpx creator="mytrail.org" version="1.0"></gpx>');
    foreach($jArr['features'] as $iFeature){
        switch( $iFeature['geometry']['type']){
            case "Point":
                $iPoint = $gpx->addChild('wpt');
                $iPoint->addAttribute("lat", $iFeature['geometry']['coordinates'][1]);
                $iPoint->addAttribute("lon", $iFeature['geometry']['coordinates'][0]);   
                //name
                $iPoint->addChild('name', $iFeature['properties']['name']);
                //desc
                $iPoint->addChild('desc', $iFeature['properties']['desc']);
            break;
            case "LineString":
                $iPoint = $gpx->addChild('trk');
                $trkseg = $iPoint->addChild('trkseg');
                foreach($iFeature['geometry']['coordinates'] as $coord){
                    $iTrkpt = $trkseg->addChild('trkpt');
                    $iTrkpt->addAttribute("lat", $coord[1]);
                    $iTrkpt->addAttribute("lon", $coord[0]);   
                }
                //name
                $iPoint->addChild('name', $iFeature['properties']['name']);
                //desc
                $iPoint->addChild('desc', $iFeature['properties']['desc']);            
            break;
            case "Polygon":
                $iPoint = $gpx->addChild('trk');
                $trkseg = $iPoint->addChild('trkseg');
                foreach($iFeature['geometry']['coordinates'][0] as $coord){
                    $iTrkpt = $trkseg->addChild('trkpt');
                    $iTrkpt->addAttribute("lat", $coord[1]);
                    $iTrkpt->addAttribute("lon", $coord[0]);   
                }
                if($closePolygons == true){
                    //add the zero index point so it's a closed linestring
                    $iTrkpt = $trkseg->addChild('trkpt');
                    $iTrkpt->addAttribute("lat", $iFeature['geometry']['coordinates'][0][0][1]);
                    $iTrkpt->addAttribute("lon", $iFeature['geometry']['coordinates'][0][0][0]); 
                }
                //name
                $iPoint->addChild('name', $iFeature['properties']['name']);
                //desc
                $iPoint->addChild('desc', $iFeature['properties']['desc']);            
            break;
        }
    }
    return $gpx->asXML();
}


/**
 * Calculates the great-circle distance between two points, with
 * the Vincenty formula.
 * @param float $latitudeFrom Latitude of start point in [deg decimal]
 * @param float $longitudeFrom Longitude of start point in [deg decimal]
 * @param float $latitudeTo Latitude of target point in [deg decimal]
 * @param float $longitudeTo Longitude of target point in [deg decimal]
 * @param float $earthRadius Mean earth radius in [m]
 * @return float Distance between points in [m] (same as earthRadius)
 */
public static function vincentyGreatCircleDistance(
  $latitudeFrom, $longitudeFrom, $latitudeTo, $longitudeTo, $earthRadius = 6371000)
{
  // convert from degrees to radians
  $latFrom = deg2rad($latitudeFrom);
  $lonFrom = deg2rad($longitudeFrom);
  $latTo = deg2rad($latitudeTo);
  $lonTo = deg2rad($longitudeTo);

  $lonDelta = $lonTo - $lonFrom;
  $a = pow(cos($latTo) * sin($lonDelta), 2) +
    pow(cos($latFrom) * sin($latTo) - sin($latFrom) * cos($latTo) * cos($lonDelta), 2);
  $b = sin($latFrom) * sin($latTo) + cos($latFrom) * cos($latTo) * cos($lonDelta);

  $angle = atan2(sqrt($a), $b);
  return $angle * $earthRadius;
}

	
}
?>
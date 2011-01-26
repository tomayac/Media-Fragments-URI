(function parseMediaFragmentsUri(opt_uri) {
  // '&' is the only primary separator for key-value pairs
  var MF_separator = '&';  
  
  // report errors?
  var MF_verbose = true;
  var MF_reportError = (function reportError(message) {
    if (MF_verbose) {
      console.log('Media Fragments URI Parsing Warning: ' + message);
    }
  });
  
  // the currently supported media fragments dimensions
  var MF_temporalDimension = 't';
  var MF_spatialDimension = 'xywh';
  var MF_trackDimension = 'track';
  var MF_namedDimension = 'id';
  // allows for O(1) checks for existance of valid keys
  MF_dimensions = {};
  MF_dimensions[MF_temporalDimension] = MF_temporalDimension;
  MF_dimensions[MF_spatialDimension] = MF_spatialDimension;
  MF_dimensions[MF_trackDimension] = MF_trackDimension;
  MF_dimensions[MF_namedDimension] = MF_namedDimension;
      
  var uri = opt_uri? opt_uri : document.location.href;
  // retrieve the query part of the URI
  var query = document.location.search;
  if (query) {
    query = query.substring(1);
  }
  // retrieve the hash part of the URI
  var hash = document.location.hash;
  if (hash) {
    hash = hash.substring(1);
  }
  /**
   * splits an octet string into allowed key-value pairs
   */
  var splitKeyValuePairs = (function splitKeyValuePairs(octetString) {
    var keyValues = {};
    var keyValuePairs = octetString.split(MF_separator);    
    keyValuePairs.forEach(function(keyValuePair) {      
      // the key part is up to the first(!) occurrence of '=', further '='-s
      // form part of the value
      var position = keyValuePair.indexOf('=');
      if (position < 1) {
        return;
      } 
      var components = [
          keyValuePair.substring(0, position),
          keyValuePair.substring(position + 1)];
      // we require a value for each key
      if (!components[1]) {
        return;
      }
      // the key name needs to be decoded
      var key = decodeURIComponent(components[0]);
      // only allow keys that are currently supported media fragments dimensions
      var dimension = MF_dimensions[key];
      if (dimension) {
        // the value needs to be decoded
        var value = decodeURIComponent(components[1]);
        
        /**
         * checks for validity of the temporal dimension
         */
        var checkTemporalDimension = (function checkTemporalDimension(value) {          
          var components = value.split(',');
          var start = components[0]? components[0] : '';
          var end = components[1]? components[1] : '';
          
          var nptSeconds = /^((npt\:)?\d+(\.\d+)?)?$/;
          var nptHoursMinutesSeconds = /^((npt\:)?\d+\:\d\d\:\d\d(\.\d+)?)?$/;
          var smpte = /^(\d\:\d\d\:\d\d(\:\d\d(\.\d\d)?)?)?$/;
          var wallClock = /^(([0-9]{4})(-([0-9]{2})(-([0-9]{2})(T([0-9]{2})\:([0-9]{2})(\:([0-9]{2})(\.([0-9]+))?)?(Z|(([-\+])([0-9]{2})\:([0-9]{2})))?)?)?)?)?$/;

          if ((nptSeconds.test(start) || nptHoursMinutesSeconds.test(start)) &&
              (nptSeconds.test(end) || nptHoursMinutesSeconds.test(end))) {
            if (start && end) {
              if (true /* ToDo: add check to ensure that start < end */) {    
                return value;
              } else {
                MF_reportError('Please ensure that start < end.');                
                return false;
              }
            } else {
              return value;
            }
          }
          start = start.replace('smpte:', '').replace('smpte-25:', '');
          start = start.replace('smpte-30:', '').replace('smpte-30-drop:', '');
          if ((smpte.test(start)) && (smpte.test(end))) {            
            if (start && end) {
              if (true /* ToDo: add check to ensure that start < end */) {    
                return value;
              } else {
                MF_reportError('Please ensure that start < end.');                                
                return false;
              }
            } else {
              return value;
            }
          }
          start = start.replace('clock:', '');
          if ((wallClock.test(start)) && (wallClock.test(end))) {
            if (start && end) {
              // if both start and end are given, then the start must be before
              // the end
              if (Date.parse(start) <= Date.parse(end)) {
                return value;
              } else {
                MF_reportError('Please ensure that start < end.');                                
                return false;
              }
            } else {
              return value;  
            }
          }
          MF_reportError('Invalid time dimension.');                          
          return false;
        });        
        
        /**
         * checks for validity of the spatial dimension
         */
        var checkSpatialDimension = (function checkSpatialDimension(value) {
          // "pixel:" is optional
          var pixelCoordinates = /^(pixel\:)?\d+,\d+,\d+,\d+$/;
          // "percent:" is obligatory
          var percentSelection = /^percent\:\d+,\d+,\d+,\d+$/;
          
          /**
           * checks for valid percent selections
           */
          var checkPercentSelection = (function checkPercentSelection(
              x, y, w, h) {
            if (!((0 <= x) && (x <= 100))) { 
              MF_reportError('Please ensure that 0 <= x <= 100.');                
              return false;
            }
            if (!((0 <= y) && (y <= 100))) { 
              MF_reportError('Please ensure that 0 <= y <= 100.');                
              return false;
            }
            if (!((0 <= w) && (w <= 100))) { 
              MF_reportError('Please ensure that 0 <= w <= 100.');                
              return false;
            }
            if (!((0 <= h) && (h <= 100))) { 
              MF_reportError('Please ensure that 0 <= h <= 100.');                
              return false;
            }            
            return true;            
          });
          
          if (pixelCoordinates.test(value)) {             
            return value;          
          } else if (percentSelection.test(value)) {
            value = value.replace('percent:', '');
            var values = value.split(','); 
            if (checkPercentSelection(
                values[0], values[1], values[2], values[3])) {
              return 'percent:' + value;
            }
            MF_reportError('Invalid percent selection.');                
            return false;
          } else {
            MF_reportError('Invalid spatial dimension.');                
            return false;
          }
        });        
        
        /**
         * checks for validity of the track dimension
         */        
        var checkTrackDimension = (function checkTrackDimension(value) {
          return value;          
        });        

        /**
         * checks for validity of the named dimension
         */                
        var checkNamedDimension = (function checkNamedDimension(value) {          
          return value;          
        });        
        
        switch(dimension) {
            case MF_temporalDimension:
                value = checkTemporalDimension(value);
                if (!value) {
                  return;
                }
                break;
            case MF_spatialDimension:
                value = checkSpatialDimension(value); 
                if (!value) {
                  return;
                }                
                break;
            case MF_trackDimension:
                value = checkTrackDimension(value);
                if (!value) {
                  return;
                }                
                break;
            case MF_namedDimension:
                value = checkNamedDimension(value);
                if (!value) {
                  return;
                }                
                break;
        } 
        // keys may appear more than once, thus store all values in an array
        if (!keyValues[key]) {
          keyValues[key] = [];
        }
        keyValues[key].push(value);
      }
    });
    return keyValues;
  });
  var keyValuesQuery = splitKeyValuePairs(query);   
  console.log(keyValuesQuery);
  var keyValuesHash = splitKeyValuePairs(hash);   
  console.log(keyValuesHash);
})()


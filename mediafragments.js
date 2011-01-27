var MediaFragments = (function(window) {
  
  "use strict";  
  
  // '&' is the only primary separator for key-value pairs
  var SEPARATOR = '&';  
  
  // report errors?
  var VERBOSE = true;
  
  var logWarning = function(message) {
    if (VERBOSE) {
      console.log('Media Fragments URI Parsing Warning: ' + message);
    }
  }
  
  // the currently supported media fragments dimensions are: t, xywh, track, id
  // allows for O(1) checks for existence of valid keys
  var dimensions = {
    t: function(value) {          
      var components = value.split(',');
      var start = components[0]? components[0] : '';
      var end = components[1]? components[1] : '';
      
      var nptSeconds = /^((npt\:)?\d+(\.\d+)?)?$/;
      var nptHoursMinutesSeconds = /^((npt\:)?\d+\:\d\d\:\d\d(\.\d+)?)?$/;
      var smpte = /^(\d\:\d\d\:\d\d(\:\d\d(\.\d\d)?)?)?$/;
      // regexp stolen from http://delete.me.uk/2005/03/iso8601.html
      var wallClock = /^((\d{4})(-(\d{2})(-(\d{2})(T(\d{2})\:(\d{2})(\:(\d{2})(\.(\d+))?)?(Z|(([-\+])(\d{2})\:(\d{2})))?)?)?)?)?$/;

      if ((nptSeconds.test(start) || nptHoursMinutesSeconds.test(start)) &&
          (nptSeconds.test(end) || nptHoursMinutesSeconds.test(end))) {
        if (start && end) {
          if (true /* ToDo: add check to ensure that start < end */) {    
            return {
              value: value,
              unit: 'npt',
              start: start,
              end: end
            };
          } else {
            logWarning('Please ensure that start < end.');                
            return false;
          }
        } else {
          return {
            value: value,
            unit: 'npt',
            start: start,
            end: end
          };
        }
      }
      var prefix = start.replace(/^(smpte(-25|-30|-30-drop)?).*/, '$1');
      start = start.replace(/^smpte(-25|-30|-30-drop)?\:/, '');      
      if ((smpte.test(start)) && (smpte.test(end))) {            
        if (start && end) {
          if (true /* ToDo: add check to ensure that start < end */) {    
            return {
              value: value,
              unit: prefix,
              start: start,
              end: end
            };            
          } else {
            logWarning('Please ensure that start < end.');                                
            return false;
          }
        } else {
          return {
            value: value,
            unit: prefix,
            start: start,
            end: end
          };          
        }
      }
      start = start.replace('clock:', '');
      if ((wallClock.test(start)) && (wallClock.test(end))) {
        if (start && end) {
          // if both start and end are given, then the start must be before
          // the end
          if (Date.parse(start) <= Date.parse(end)) {            
            return {
              value: value,
              unit: 'clock',
              start: start,
              end: end
            };            
          } else {
            logWarning('Please ensure that start < end.');                                
            return false;
          }
        } else {
          return {
            value: value,
            unit: 'clock',
            start: start,
            end: end
          };          
        }
      }
      logWarning('Invalid time dimension.');                          
      return false;
    },
    xywh: function(value) {
      // "pixel:" is optional
      var pixelCoordinates = /^(pixel\:)?\d+,\d+,\d+,\d+$/;
      // "percent:" is obligatory
      var percentSelection = /^percent\:\d+,\d+,\d+,\d+$/;
      
      var values = value.replace(/(pixel|percent)\:/, '').split(','); 
      var x = values[0];
      var y = values[1];
      var w = values[2];
      var h = values[3];                              
      if (pixelCoordinates.test(value)) {             
        return {
          value: value,
          unit: 'pixel',          
          x: x,
          y: y,
          w: w,
          h: h
        };
      } else if (percentSelection.test(value)) {
        /**
         * checks for valid percent selections
         */
        var checkPercentSelection = (function checkPercentSelection(
            x, y, w, h) {
          if (!((0 <= x) && (x <= 100))) { 
            logWarning('Please ensure that 0 <= x <= 100.');                
            return false;
          }
          if (!((0 <= y) && (y <= 100))) { 
            logWarning('Please ensure that 0 <= y <= 100.');                
            return false;
          }
          if (!((0 <= w) && (w <= 100))) { 
            logWarning('Please ensure that 0 <= w <= 100.');                
            return false;
          }
          if (!((0 <= h) && (h <= 100))) { 
            logWarning('Please ensure that 0 <= h <= 100.');                
            return false;
          }            
          return true;            
        });        
        if (checkPercentSelection(x, y, w, h)) {
          return {
            value: value,
            unit: 'percent',          
            x: x,
            y: y,
            w: w,
            h: h
          };
        }
        logWarning('Invalid percent selection.');                
        return false;
      } else {
        logWarning('Invalid spatial dimension.');                
        return false;
      }
    },
    track: function(value) {
      return {
        value: value,
        name: value
      };
    },
    id: function(value) {          
      return {
        value: value,
        id: value
      };
    }
  }      
  
  /**
   * splits an octet string into allowed key-value pairs
   */
  var splitKeyValuePairs = function(octetString) {
    var keyValues = {};
    var keyValuePairs = octetString.split(SEPARATOR);    
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
      var dimensionChecker = dimensions[key];
      // the value needs to be decoded
      var value = decodeURIComponent(components[1]);
      if (dimensionChecker) {
        value = dimensionChecker(value);
      } else {
        // we had a key that is not part of media fragments
        return;
      }
      if (!value) {
        return;
      }                        
      // keys may appear more than once, thus store all values in an array
      if (!keyValues[key]) {
        keyValues[key] = [];
      }
      keyValues[key].push(value);
    });
    return keyValues;
  }  
  
  return {
    parseMediaFragmentsUri: function(opt_uri) {    
      var uri = opt_uri? opt_uri : window.location.href;
      // retrieve the query part of the URI    
      var indexOfHash = uri.indexOf('#');
      var indexOfQuestionMark = uri.indexOf('?');
      var end = (indexOfHash !== -1? indexOfHash : uri.length);
      var query = indexOfQuestionMark !== -1?
          uri.substring(indexOfQuestionMark + 1, end) : '';
      // retrieve the hash part of the URI
      var hash = indexOfHash !== -1? uri.substring(indexOfHash + 1) : '';
      var queryValues = splitKeyValuePairs(query);
      var hashValues = splitKeyValuePairs(hash);
      return {
        query: queryValues,
        hash: hashValues,
        toString: function() {
          var buildString = function(name, thing) {
            var s = '\n[' + name + ']:\n';
            Object.keys(thing).forEach(function(key) {
              s += '  * ' + key + ':\n';
              thing[key].forEach(function(value) {
                s += '    [\n';
                Object.keys(value).forEach(function(valueKey) {
                  s += '      - ' + valueKey + ': ' + value[valueKey] + '\n';
                });
                s += '   ]\n';
              }); 
            });
            return s;
          }
          var string =
              buildString('Query', queryValues) +
              buildString('Hash', hashValues);
          return string; 
        }      
      };
    }
  }
})(window)
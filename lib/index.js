const request = require('request');
const url = require('url');

module.exports = function() {
  return archomp;
};

const baseURL = 'https://archomp.orijtech.com/v1';

// @params:
// * apiKey:		     [required] the API key for the archomp API
// * ignoreInvalidResources: [optional] if set, means that any invalid results
//			     that would otherwise prevent normal processing, will be ignored
// * inTest:		     [optional] signals that we are test mode
// * roundTripper:	     [optional] a drop-in replacement to ensure a full end to end
//					call of resources is made, for example in testing
// * userAgent:		     [optional] the UserAgent of the caller
function archomp() {
  this.version = 'v1';
  this.init.apply(this, arguments);
}

archomp.prototype.init = function() {
  var config = {};
  if (arguments.length > 0)
    config = arguments[0] || {};

  this.apiKey = config.apiKey;
  this.inTest = config.inTest;
  this.roundTripper = config.roundTripper;
  this.ignoreInvalidResources = config.ignoreInvalidResources;
};

archomp.prototype.compress = function(args, callback) {
  if (!(this.apiKey && typeof this.apiKey === 'string' && this.apiKey.length > 0))
    return callback(400, {"error": [{"msg": "unset apiKey"}]});

  // The goal is to compress and then stream back
  // the content then write it as a .zip file to disk.
  var files = args && args.files || [];
  // var callback = arguments.length > 1 && typeof arguments[1] === 'function' ? arguments[1] : null;

  if (files.length < 1)
    return callback(400, {"errors": [{"msg": "expecting \"files\""}]});

  var validateResults = validateResources(files);
  var hasAnyValidResource = validateResults && validateResults.valid && validateResults.valid.length > 0;
  var hasInvalidResources = validateResults && validateResults.invalid && validateResults.invalid.length > 0;

  if (hasInvalidResources && !this.ignoreInvalidResources) 
    return callback(400, {"errors": validateResults.invalid});
  else if (!hasAnyValidResource)
    return callback(400, {"errors": [{"msg": "expecting valid resources"}]});

  var reqDo = request;
  if (this.roundTripper)
    reqDo = this.roundTripper;

  // Good to go
  var reqData = {"files": validateResults.valid};
  var headers = {'Content-Type': 'application/json'};

  headers['User-Agent'] = this.userAgent || 'archomp-nodejs-client';

  var options = {
    url: baseURL,
    json: reqData,
    encoding: null,
    method: 'POST',
    headers: headers,
  };

  reqDo(options, function(err, response, body) {
    if (err)
      return callback(500, err);

    if (!statusOK(response.statusCode))
      return callback(response.statusCode, response.status);

    callback(200, body);
  });
};

function statusOK(code) {
  return code >= 200 && code <= 299;
}

// @params: files, array of the form
// [
//    {
//	"url": "https://orijtech.com",
//	"name": "<optional_name>"
//    },
//    {
//	"url": "https://nodejs.org",
//    }
// ]
// @returns: []validFiles
function validateResources(resources) {
  resources = resources || [];
  if (resources.length < 1 || !resources.forEach)
    return {};

  var valid = [];
  var invalid = [];
  resources.forEach(function(resource) {
    var bucket = invalid;
    if (!(resource && resource.url)) {
      invalid.push('expecting "url" to have been set');
    } else {
      var validateErr = validateURL(resource.url);
      if (validateErr) {
	invalid.push(validateErr)
      } else {
	valid.push(resource);
      }	
    }
  });

  return {valid: valid, invalid: invalid};
}

function validateURL(theURL) {
  theURL = theURL + '';
  var u = url.parse(theURL);
  if (u && u.protocol && u.host && u.path)
    return null;

  var errs = {};
  if (!u.host)
    errs.host = 'expecting a non-blank host';
  if (!u.path)
    errs.path = 'expecting a non-blank path';
  if (!u.protocol)
    errs.protocol =  'expecting a non-blank protocol';

  return errs;
}

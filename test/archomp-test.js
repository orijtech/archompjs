const fs = require('fs');
const url = require('url');
const assert = require('assert');
const archomp = require('../archomp');

function anyInvalidURL(resources) {
  if (!(resources && resources.length > 0))
    return true;

  for (var i=0; i < resources.length; i++) {
    var resource = resources[i];
    try {
      var u = url.parse(resource.url);
      if (!(u.host && u.protocol && u.path))
	return false;
    } catch(ex) {
      return true;
    }
  }

  return false;
}

function customRoundTripper(reqBody, errResBodyCallback) {
  // 1. Ensure that JSON is set
  if (!(reqBody && reqBody.json && typeof reqBody.json === 'object'))
    return errResBodyCallback(null, {'errors': 'expecting "json" as an object'}, null);

  // 2. Ensure that files are set
  if (!(reqBody.json.files && reqBody.json.files.length > 0))
    return errResBodyCallback(null, {'errors': 'expecting "files" to have been set'}, null);

  // 3. Ensure no invalid URLs are sent
  if (anyInvalidURL(reqBody.json.files))
    return errResBodyCallback(null, {'errors': 'all "files" have to have valid URLs'}, null);

  // 4. Ensure that the JSON is parseable
  try {
    var strfyd = JSON.stringify(reqBody.json);
  } catch(ex) {
    return errResBodyCallback(null, {'errors': ex}, null);
  }

  // Otherwise all done, just send back that test zip
  fs.readFile('./testdata/test.zip', function(err, body) {
    if (err)
      return errResBodyCallback(err, {statusCode: 500}, null);

    errResBodyCallback(null, {statusCode: 200}, body);
  });
}

describe('Expected fails', function() {
  it('blank API key', function() {
    var arc = new archomp({}); 
    arc.compress({
      files: [{
	url: "https://orijtech.com/",
      }]
    }, function(statusCode, msg) {
      assert.equal(statusCode, 400, 'expecting a non-successful code');
      var strfyd = JSON.stringify(msg);
      assert.equal(strfyd.search('apiKey') >= 0, true, 'expecting message about the apiKey not being set');
    });
  });
});

describe('Full roundtripped tests', function() {
  it('ignoreInvalidResources', function() {
    var arc = new archomp({
      apiKey: '90641829-8c21-4647-b48b-24e3c39b2b58',
      roundTripper: customRoundTripper,
      ignoreInvalidResources: true,
    });

    arc.compress({
      files: [{
	url: "https://orijtech.com/",
      }, {
	url: "https", // The invalid resource here
      }, {
	url: "localhost", // The invalid resource here
      }]
    }, function(statusCode, body) {
      assert.equal(statusCode, 200, 'expecting a successful response since ignoring invalidResources');
      assert.equal(!body, false, 'expecting a body');
      console.log(body);
      assert.equal(body.length > 0, true, 'expecting a body with content');
    });
  });

  it('all resources must be valid', function() {
    var arc = new archomp({
      apiKey: '90641829-8c21-4647-b48b-24e3c39b2b58',
      roundTripper: customRoundTripper,
    });

    arc.compress({
      files: [{
	url: "https://orijtech.com/",
      }, {
	url: "https",
      }]
    }, function(statusCode, body) {
      assert.equal(statusCode, 400, 'expecting a bad request since not ignoring invalidResources');
    });
  });
});

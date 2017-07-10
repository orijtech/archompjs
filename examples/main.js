const fs = require('fs');
const archomp = require('archomp');

function main() {
  var arc = new archomp({apiKey: 'd0aa7829-e5d1-4d7f-8917-5327653f9bee'});

  arc.compress({
    "files": [{
      "url": "https://orijtech.com/", "name": "orijtech-homepage.html"
    }, {
      "url": "https://tatan.s3-us-west-2.amazonaws.com/uno.gif", "name": "guap.gif"
    }]
  }, function(statusCode, r) {
    if (statusCode !== 200) {
      console.log(r);
      return;
    }

    var outfile = 'outf.zip'
    fs.writeFile(outfile, r, function(err) {
      if (err)
	throw err;

      console.log('Successfully saved to %s!', outfile);
    });
  });
}

if (process.argv.length >= 2 && process.argv[1] === __filename)
  main();

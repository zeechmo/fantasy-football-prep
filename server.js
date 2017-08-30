const express = require('express')  
const https = require('https')
const nodemailer = require('nodemailer')
const xml2js = require('xml2js')
const _ = require('underscore')
const config = require('./config')
const bodyParser = require("body-parser");
const app = express()  
const port = 3000

// server html
app.use(express.static('public'))
// server js libaries
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));
app.use('/gridstack', express.static(__dirname + '/node_modules/gridstack/dist/'));
app.use('/underscore', express.static(__dirname + '/node_modules/underscore/'));

//Here we are configuring express to use body-parser as middle-ware.
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (request, response) => {  
  response.send('Hello from Express!')
})

app.post('/email', (request, response) => {

	console.log(request.body);

	var players = request.body.players;
	console.log(_.values(request.body.players));
	var email = request.body.email;
	
	// create reusable transporter object using the default SMTP transport
	let transporter = nodemailer.createTransport({
		service: config.emailhost,
		auth: {
			user: config.emailuser,
			pass: config.emailpass
		}
	});
	
	// format html for email
	var players = _.values(players);
	let html = '<html><body><table>';
	html += '<p>Here are your custom draft rankings courtesy of <a href="http://www.draftrule.com">DraftRule</a>.</p>';
	html += '<th>Your Rank</th><th>Player</th><th>Position</th><th>Team</th>';
	for (var i = 0; i < players.length; i++) {

		var isDark = !!players[i].dark;
		html += '<tr><td>' + (!!players[i].favorite ? "&#9733;" : "") + '</td><td>' + (i+1) + '</td><td>' + (isDark ? '<s>' : '') + players[i].playerName + (isDark ? '</s>' : '') + '</td><td>' + players[i].position + '</td><td>' + players[i].team + '</td></tr>';
	}
	html += '</table></body><p>Good Luck!</p><p>Your friends at <a href="http://www.draftrule.com">DraftRule</a></html>';

	// setup email data with unicode symbols
	let mailOptions = {
		from: '"Support" <zbrownson@hotmail.com>', // sender address
		to: email, // list of receivers
		subject: 'DraftRule - Custom Draft Order', // Subject line
		text: '', // plain text body
		html: html // html body
	};

	// send mail with defined transport object
	transporter.sendMail(mailOptions, (error, info) => {
		if (error) {
			console.log(error);
			response.send(JSON.stringify({
				"errorMsg": error
			}));
		}
		console.log('Message %s sent: %s', info.messageId, info.response);
		response.send(JSON.stringify({
			success: true
		}));
	});
})

app.get('/draftboard', (request, response) => {  

	var format = request.query.format || 'standard';
	var teams = request.query.teams;
	
	if (teams === '8 team') {
		teams = 8;
	}
	else if (teams === '10 team') {
		teams = 10;
	}
	else if (teams === '12 team') {
		teams = 12;
	}
	else if (teams === '14 team') {
		teams = 14;
	}
	else {
		teams = 12;
	}
	
	console.log(teams);

	var options = {
		host: 'fantasyfootballcalculator.com',
		port: 443,
		path: '/adp_xml.php?format=' + format + '&teams=' + teams,
		rejectUnauthorized: false,
		requestCert: true,
		agent: false
	};
	
	console.log(options.host + options.path);

	https.get(options, function(resp){
		resp.setEncoding('utf8');
		
		let allData = "";
		
		resp.on('data', function(chunk){
			allData += chunk;
		});
		resp.on('end', function() {
			
			var xml = allData;
			xml2js.parseString(xml, function(err, result) {
				
				// parse xml into meaningful data to send to client
				var players = result.root.adp_data[0].player;
				
				var results = [];
				for (var i = 0; i < players.length; i++) {
					
					results.push({
						"playerName": players[i].name[0],
						"position": players[i].pos[0],
						"team": players[i].team[0]
					});
				}
				
				response.send(JSON.stringify(results));
			});
			
		});
	}).on("error", function(e){
		console.log("Got error: " + e.message);
	});
	
})


app.listen(port, (err) => {  
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
})
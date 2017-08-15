const express = require('express')  
const https = require('https')
const nodemailer = require('nodemailer')
const _ = require('underscore')
const config = require('./config');
const app = express()  
const port = 3000

// server html
app.use(express.static('public'))
// server js libaries
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));
app.use('/gridstack', express.static(__dirname + '/node_modules/gridstack/dist/'));
app.use('/underscore', express.static(__dirname + '/node_modules/underscore/'));

app.get('/', (request, response) => {  
  response.send('Hello from Express!')
})

app.get('/email', (request, response) => {
	var players = request.query.players;
	var email = request.query.email;
	
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
	html += '<p>Here are your custom draft rankings courtesy of <a href="http://www.fantasyfootballprep.com">Fantasy Football Prep</a>.</p>';
	html += '<th>Your Rank</th><th>Player</th><th>Position</th><th>Team</th>';
	for (var i = 0; i < players.length; i++) {
		html += '<tr><td>' + (i+1) + '</td><td>' + players[i].playerName + '</td><td>' + players[i].position + '</td><td>' + players[i].team + '</td></tr>';
	}
	html += '</table></body><p>Good Luck!</p><p>Your friends at <a href="http://www.fantasyfootballprep.com">Fantasy Football Prep</a></html>';

	// setup email data with unicode symbols
	let mailOptions = {
		from: '"Support" <zbrownson@hotmail.com>', // sender address
		to: email, // list of receivers
		subject: 'Fantasy Football Prep - Custom Draft Order', // Subject line
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
		path: '/adp_csv.php?format=' + format + '&teams=' + teams,
		rejectUnauthorized: false,
		requestCert: true,
		agent: false
	};
	
	console.log(options.host + '/' + options.path);

	https.get(options, function(resp){
		resp.setEncoding('utf8');
		
		let allData = "";
		
		resp.on('data', function(chunk){
			allData += chunk;
		});
		resp.on('end', function() {
			
			// parse csv into meaningful data to send to client
			var players = [];
			var lines = allData.split("\n");
			for (var i = 0; i < lines.length; i++) {
				if (i < 5) {
					continue;
				}
				var tokens = lines[i].split(",");
				players.push({
					"playerName": tokens[2],
					"position": tokens[3],
					"team": tokens[4]
				});
			}
			
			response.send(JSON.stringify(players));
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
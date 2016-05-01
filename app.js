var customUtils = require('./config/utils.js');
var debug = require('debug')('DutyHours:server');
var http = require('http');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

customUtils.customRequire(__dirname);

var config = config_require('config');

var routes = routes_require('index');
var user = routes_require('user');
var params = routes_require('params');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// set up named params
app.param('userID', params.user);

// setup routes
routes_require('user')(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

GLOBAL.DUTYHOURS = { config: { } };

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
	DUTYHOURS.config = config.getDevelopmentConfig();
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production and staging error handler
// no stacktraces leaked to user
if (app.get('env') === 'staging') {
	DUTYHOURS.config = config.getStaging();
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: {}
		});
	});
}
if (app.get('env') === 'production') {
	DUTYHOURS.config = config.getProduction();
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: {}
		});
	});
}

// get port
var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

// create http server
var server = http.createServer(app);

// connect to mongo
mongoose.connect(DUTYHOURS.config.mongoConnString);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', loadHttpServer);

// start web server
function loadHttpServer() {
	server.listen(port);
	server.on('error', onError);
	server.on('listening', onListening);
}

// normalize port
function normalizePort(val) {
	var port = parseInt(val, 10);

	if (isNaN(port)) {
		// named pipe
		return val;
	}

	if (port >= 0) {
		// port number
		return port;
	}

	return false;
}

// error handler
function onError(error) {
	if (error.syscall !== 'listen') {
		throw error;
	}

	var bind = typeof port === 'string'
		? 'Pipe ' + port
		: 'Port ' + port;

	// handle specific listen errors with friendly messages
	switch (error.code) {
		case 'EACCES':
			console.error(bind + ' requires elevated privileges');
			process.exit(1);
			break;
		case 'EADDRINUSE':
			console.error(bind + ' is already in use');
			process.exit(1);
			break;
		default:
			throw error;
	}
}

// called when web server starts listening
function onListening() {
	var addr = server.address();
	var bind = typeof addr === 'string'
		? 'pipe ' + addr
		: 'port ' + addr.port;
	console.log('Express server listening on port ' + addr.port + ' in ' + app.get('env') + ' mode.');
	debug('Listening on ' + bind);
}

process.on('uncaughtException', function(err) {
	console.error(err.stack);
});
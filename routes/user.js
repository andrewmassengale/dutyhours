var _ = require('underscore');
var moment = require('moment');
var async = require('async');

var analyzeSchedule = module_require('analyzeSchedule');
var userSchema = schema_require('UserSchema');
var userApi = routes_require('userApi');

module.exports = function (app) {
	// POST /api/user
	// Creates a new user
	app.post('/api/user/', function (req, res, next) {
		if (invalidInput(req.body, [ 'name', 'email', 'username', 'password' ])) {
			return next(new Error('invalid body data'));
		}

		userApi.createUser(req, manageApiReturn.bind(this, res, next));
	});

	// POST /api/user/:userID/schedule
	// Adds a schedule item to a user. Does some error checking
	app.post('/api/user/:userID/schedule', function (req, res, next) {
		if (invalidInput(req.body, [ 'start', 'end' ])) {
			return next(new Error('invalid body data'));
		}

		userApi.addUserScheduleItem(req, manageApiReturn.bind(this, res, next));
	});

	// GET /api/user/:userID/schedule
	// Gets a schedule for a single user. Optionally analyzes their schedule
	app.get('/api/user/:userID/schedule', function (req, res, next) {
		if (invalidInput(req.query, [ 'start' ])) {
			return next(new Error('invalid query data'));
		}

		userApi.getSingleSchedule(req, manageApiReturn.bind(this, res, next));
	});

	// GET /api/user/schedule
	// Gets schedules for multiple users. Optionally analyzes each of their schedules
	app.get('/api/user/schedule', function (req, res, next) {
		if (invalidInput(req.query, [ 'ids', 'start' ])) {
			return next(new Error('invalid query data'));
		}

		userApi.getMultipleSchedules(req, manageApiReturn.bind(this, res, next));
	});
}

// checks to make sure all of the inputs are valid
function invalidInput(input, test) {
	return _(input).chain().keys().intersection(test).value().length !== test.length;
}

// handles the return of the api function handlers
function manageApiReturn(res, next, err, results) {
	if (err) next(err);
	else res.json(results);
}
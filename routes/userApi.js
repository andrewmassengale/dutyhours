/**
 * Handles all of the logic for the API calls for all functions that are user related.
 *
 * @class userApi
 * @static
 * @constructor
 */
var _ = require('underscore');
var moment = require('moment');
var async = require('async');

var analyzeSchedule = module_require('analyzeSchedule');

var userSchema = schema_require('UserSchema');

/**
 * Creates a new user.
 *
 * 	POST /api/user
 *
 * @method createUser
 * @param {String} name The full name of the new user
 * @param {String} email The email address of the new user
 * @param {String} username The username of the new user
 * @param {String} password The password of the new user
 * @return {Object} Returns the following object:
 *
 * 	{
 * 		success: true,
 * 		userID: String // the new user's ID
 * 	}
 */
module.exports.createUser = function (req, callback) {
	var newUserData = {
		name: req.body.name,
		email: req.body.email,
		username: req.body.username,
		password: req.body.password
	};

	userSchema.addUser(newUserData, function (err, newUser) {
		if (err) return callback(new Error(err));

		callback(null, { success: true, userID: newUser._id.toString() });
	});
};

/**
 * Adds a schedule item to an existing user.
 *
 * 	POST /api/user/:userID/schedule
 *
 * @method addUserScheduleItem
 * @param {String} userID The id of the user you are adding a schedule item to should be in the URL of the request as outlined above.
 * @param {Number} start The start date/time of the new schedule item. The date should be sent as a UNIX timestamp.
 * @param {Number} end The end date/time of the new schedule item. The date should be sent as a UNIX timestamp.
 * @return {Object} Returns the following object:
 *
 * 	{
 * 		success: true
 * 	}
 */
module.exports.addUserScheduleItem = function (req, callback) {
	var scheduleData = {
		startDate: moment.unix(req.body.start),
		endDate: moment.unix(req.body.end)
	};

	req.user.addScheduleItem(scheduleData, function (err, user) {
		if (err) callback(err);
		else callback(null, { success: true });
	});
};

/**
 * Gets a schedule for a specific user. The date range is calcuated as the start date passed in plus 4 weeks.
 *
 * 	GET /api/user/:userID/schedule
 *
 * @method getSingleSchedule
 * @see analyzeSchedule See the analyze schedule class for implementation details on how a schedule is analyzed.
 * @param {String} userID The id of the user you are getting a schedule for should be in the URL of the request as outlined above.
 * @param {String} start  The start date of the user's schedule
 * @param {Number} [analyze=0] Whether or not to analyze the user's schedule.
 * @return {Object} Returns the following object:
 *
 * 	{
 * 		success: true,
 * 		schedule: {
 * 			userID: String,
 * 			schedule: [ {
 * 				startDate: Date,
 * 				endDate: Date
 * 			},
 * 			...
 * 			],
 * 			analysis: Analysis // only added if the `analyze` option is set to 1
 * 		}
 * 	}
 */
module.exports.getSingleSchedule = function (req, callback) {
	var schedule = getScheduleReturn(req.user, req.query.start, req.query.analyze);
	callback(null, { success: true, schedule: schedule });
};

/**
 * Gets a schedule for multiple users. The date range is calcuated as the start date passed in plus 4 weeks.
 *
 * 	GET /api/user/schedule
 *
 * @method getMultipleSchedules
 * @see analyzeSchedule See the analyze schedule class for implementation details on how a schedule is analyzed.
 * @param {String} ids A list of user IDs separated by commas that you want to get schedules for.
 * @param {String} start The start date of the user's schedule
 * @return {Object} Returns the following object:
 *
 * 	{
 * 		success: true,
 * 		schedules: [ {
 * 			userID: String,
 * 			schedule: [ {
 * 				startDate: Date,
 * 				endDate: Date
 * 			},
 * 			...
 * 			],
 * 			analysis: Analysis
 * 		},
 * 		...
 * 		]
 * 	}
 */
module.exports.getMultipleSchedules = function (req, callback) {
	async.waterfall([
		function getUsers(cb) {
			userSchema.findMultipleUsersById(req.query.ids.split(','), function (err, users) {
				if (err) return cb(err);

				cb(null, users);
			});
		},

		function getUsersSchedules(users, cb) {
			var userSchedules = _(users).map(function (user) {
				return getScheduleReturn(user, req.query.start, req.query.analyze);
			});
			cb(null, userSchedules);
		}
	], function (err, returnObj) {
		if (err) callback(err);
		else callback(null, { success: true, schedules: returnObj });
	});
};

/**
 * Helper function that gets the schedule for a single user.
 *
 * @method getScheduleReturn
 * @private
 * @param {Object} user The user object you are getting a modified schedule for.
 * @param {String} start The start date the schedule should start at.
 * @param {Boolean} analyze=false Whether or not to analyze the schedule for invalid schedule entries.
 * @return {Object} Returns the following object:
 *
 * 	{
 * 		userID: String,
 * 		schedule: [ {
 * 			startDate: Date,
 * 			endDate: Date
 * 		},
 * 		...
 * 		],
 * 		analysis: Analysis // only added if the analyze param is set to true
 * 	}
 */
function getScheduleReturn(user, start, analyze) {
	var startDate = moment(start);
	startDate
		.set('hour', DUTYHOURS.config.scheduleCreator.startTime.hours)
		.set('minute', DUTYHOURS.config.scheduleCreator.startTime.minutes)
		.set('second', DUTYHOURS.config.scheduleCreator.startTime.seconds);
	endDate = startDate.clone().add(DUTYHOURS.config.scheduleCreator.numWeeks, 'weeks'); // make sure to clone first, since .add() overwrites the original object
	endDate
		.set('hour', DUTYHOURS.config.scheduleCreator.endTime.hours)
		.set('minute', DUTYHOURS.config.scheduleCreator.endTime.minutes)
		.set('second', DUTYHOURS.config.scheduleCreator.endTime.seconds);

	var filteredSchedule = user.filterSchedule(startDate, endDate);
	var returnObj = {
		userID: user._id.toString(),
		schedule: _(filteredSchedule).map(function (item) {
			return {
				startDate: moment(item.startDate).unix(),
				endDate: moment(item.endDate).unix()
			};
		})
	};

	if (analyze) {
		returnObj.analysis = analyzeSchedule.analyze(startDate, endDate, returnObj.schedule);
	}

	return returnObj;
}
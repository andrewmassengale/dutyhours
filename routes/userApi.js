var _ = require('underscore');
var moment = require('moment');
var async = require('async');

var analyzeSchedule = module_require('analyzeSchedule');

var userSchema = schema_require('UserSchema');

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

module.exports.addUserScheduleItem = function (req, callback) {
	var scheduleData = {
		startDate: moment(parseInt(req.body.start, 10)),
		endDate: moment(parseInt(req.body.end, 10))
	};

	req.user.addScheduleItem(scheduleData, function (err, user) {
		if (err) callback(err);
		else callback(null, { success: true });
	});
};

module.exports.getSingleSchedule = function (req, callback) {
	var schedule = getScheduleReturn(req.user, req.query.start, req.query.analyze);
	callback(null, { success: true, schedule: schedule });
};

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

function getScheduleReturn(user, start, analyze) {
	var startDate = moment(start);
	startDate.set('hour', 0).set('minute', 0).set('second', 0);
	endDate = startDate.clone().add(4, 'weeks'); // make sure to clone first, since .add() overwrites the original
	endDate.set('hour', 23).set('minute', 59).set('second', 59);

	var filteredSchedule = user.filterSchedule(startDate, endDate);
	var returnObj = {
		userID: user._id.toString(),
		schedule: _(filteredSchedule).map(function (item) {
			return {
				startDate: parseInt(moment(item.startDate).format('x'), 10),
				endDate: parseInt(moment(item.endDate).format('x'), 10)
			};
		})
	};

	if (analyze) {
		returnObj.analysis = analyzeSchedule.analyze(startDate, endDate, returnObj.schedule);
	}

	return returnObj;
}
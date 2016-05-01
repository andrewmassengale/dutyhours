/**
 * __Schema definition:__
 *
 * 	var userSchema = new mongoose.Schema({
 * 		name     : String,
 * 		email    : String,
 * 		username : String,
 * 		password : String,
 * 		schedule : [ scheduleSchema ]
 * 	}, { collection: 'users', autoIndex: false, versionKey: false });
 *
 * @class userSchema
 * @static
 * @constructor
 */
var mongoose = require('mongoose');
var _ = require('underscore');
var async = require('async');
var moment = require('moment');

var scheduleSchema = {
	startDate: Date,
	endDate: Date
};

var userSchema = new mongoose.Schema({
	name     : String,
	email    : String,
	username : String,
	password : String,
	schedule : [ scheduleSchema ]
}, { collection: 'users', autoIndex: false, versionKey: false });

/**
 * Finds a single user given their id.
 *
 * @method  findByUserID
 * @async
 * @param {Object/String} userID The id of the user you are searching for
 * @param {Function} callback Callback function with the user details.
 * @param {Object} callback.err The first param of the callback will be an error if there was one.
 * @param {Object} callback.user The second param will be the found user.
 */
userSchema.statics.findByUserID = function (userID, callback) {
	var user = this;

	userID = mongoose.Types.ObjectId(userID.toString());
	user
		.findOne({ _id: userID })
		.exec(function (err, foundUser) {
			if (err) return callback(err);

			callback(null, foundUser);
		});
};

/**
 * Returns multiple users at once given a set of IDs.
 *
 * @method  findMultipleUsersById
 * @async
 * @param {Array} ids An array of user IDs.
 * @param {Function} callback Callback function with the user details.
 * @param {Object} callback.err The first param of the callback will be an error if there was one.
 * @param {Object} callback.user The second param will be the found users.
 */
userSchema.statics.findMultipleUsersById = function (ids, callback) {
	var user = this;

	ids = _(ids).map(function (id) { return mongoose.Types.ObjectId(id.toString()); });
	user
		.find({ _id: { $in: ids } })
		.exec(function (err, users) {
			if (err) return callback(err);

			callback(null, users);
		});
};

/**
 * Returns a user's schedule filtered to a specific date.
 *
 * @method  filterSchedule
 * @param  {Date} startDate The start date to filter by.
 * @param  {Date} endDate The end date to filter by.
 * @return {Array} Returns an array of just the user's filtered schedule.
 */
userSchema.methods.filterSchedule = function (startDate, endDate) {
	var user = this;

	var t = _(user.toJSON().schedule)
		.chain()
		.filter(function (item) {
			var start = moment(item.startDate);
			var end = moment(item.endDate);

			return (start.isBetween(startDate, endDate) && end.isBetween(startDate, endDate));
		})
		.sortBy(function (item) {
			return moment(item.startDate).toDate();
		})
		.value();

	return t;
};

/**
 * Adds a user to the database.
 *
 * @method  addUser
 * @async
 * @param {Object} userData An object containing all of the user's information.
 * @param {String} userData.name The name of the new user.
 * @param {String} userData.email The email address of the new user.
 * @param {String} userData.username The username of the new user.
 * @param {String} userData.password The new user's password.
 * @param {Function} callback Callback function with the new user.
 * @param {Object} callback.err The first param of the callback will be an error if there was one.
 * @param {Object} callback.user The second param will be the new user object.
 */
userSchema.statics.addUser = function (userData, callback) {
	var user = this;

	var newUserData = {
		name: userData.name,
		email: userData.email,
		username: userData.username,
		password: userData.password
	};
	var newUser = new user(newUserData)
	newUser.save(newUser, function (err, newUserModel) {
		if (err) return callback(err);

		callback(null, newUserModel);
	});
};

/**
 * Adds a schedule item to an existing user. The following checks are run on the new schedule item against
 * all of the other schedule items for the specified user before it is inserted:
 *
 * * Make sure the start date is not the same as another start date
 * * Make sure the end date is not the same as another end date
 * * Make sure the start date is not between another start and end date
 * * Make sure the end date is not between another start and end date
 * * Make sure the start and end date are not the same item
 * * Make sure the end date is after the start date
 * @param {Function} callback Callback function with the user with the new schedule item.
 * @param {Object} callback.err The first param of the callback will be an error if there was one.
 * @param {Object} callback.user The second param will be the new user object.
 */
userSchema.methods.addScheduleItem = function (scheduleData, callback) {
	var user = this;

	var conflictingScheduleItems = _(user.schedule).some(function (item) {
			var iStart = moment(item.startDate), iEnd = moment(item.endDate);

			var conflicts = 
				scheduleData.startDate.isSame(iStart) || scheduleData.endDate.isSame(iEnd) ||
				scheduleData.startDate.isBetween(iStart, iEnd) || scheduleData.endDate.isBetween(iStart, iEnd);

			return conflicts;
		}) ||
		scheduleData.startDate.isAfter(scheduleData.endDate) ||
		scheduleData.startDate.isSame(scheduleData.endDate);

	if (conflictingScheduleItems) return callback(new Error('invalid schedule item'));

	var scheduleItem = {
		startDate: scheduleData.startDate,
		endDate: scheduleData.endDate
	};
	user.schedule.push(scheduleItem);
	user.save(function (err, newUser) {
		if (err) return callback(err);

		callback(null, newUser);
	});
};

// save and export the model
var model = mongoose.model('User', userSchema);
module.exports = model;
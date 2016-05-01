/**
 * Analyzes a single user's schedule.
 *
 * @class analyzeSchedule
 * @static
 * @constructor
 */
var _ = require('underscore');
var moment = require('moment');

/**
 * Analyzes a schedule for invalid hours.
 *
 * @method analyze
 * @param {Date} startDate The start date for the timeframe for the schedule
 * @param {Date} endDate The end date for the timeframe for the schedule
 * @param {Array} schedule An array of the schedule items you are analyzing. Each array
 * item should look as follows:
 *
 * 	{
 * 		startDate: Date,
 * 		endDate: Date
 * 	}
 * 	...
 * @return Object Returns an object describing any and all of the schedule violations. The
 * return will be formatted as follows:
 *
 * 	{
 * 		timeOff: Array, // either false or an array of indeces referencing the original schedule param of the violators
 * 		longShifts: Array, // either false or an array of indeces referencing the original schedule param of the violators
 * 		enoughTimeOff: Array, // true if the schedule had enough time off, false if not
 * 		averageHours: Boolean // either false or an array of indeces referencing the original schedule param of the violators
 * 	}
 */
module.exports.analyze = function (startDate, endDate, schedule) {
	var durationsHash = getTimeOffDurations(startDate, endDate, schedule);

	var shortTimeOff = discoverShortTimeOff(durationsHash);
	var longShifts = discoverLongShifts(durationsHash);
	var enoughTimeOff = discoverEnoughTimeOff(durationsHash);
	var averageHoursWorked = discoverAverageHoursWorked(durationsHash);

	return {
		timeOff: (shortTimeOff.length > 0) ? shortTimeOff : false,
		longShifts: (longShifts.length > 0) ? longShifts : false,
		enoughTimeOff: enoughTimeOff,
		averageHours: (averageHoursWorked.length > 0) ? averageHoursWorked : false
	};
};

/**
 * Helper function that simply diffs two dates by their hours.
 *
 * @method timeDiff
 * @private
 * @param {Object} t1 The time you are diffing against (e.g. the larger time).
 * @param {Object} t2 The time you are diffing from (e.g. the smaller time).
 * @return {Number} Returns the number of hours the two times are from each other.
 */
function timeDiff(t1, t2) {
	return moment(t1).diff(moment(t2), 'hours', true);
}

/**
 * Creates a hash of all the durations between the start and end time. The diff between the start of the first shift and
 * the start of the shcedule analysis is included, as is the end of the last shift and the end of the schedule analysis.
 *
 * @method getTimeOffDurations
 * @param {Object} startDate The start date of the analysis.
 * @param {Object} endDate The end date of the analysis.
 * @param {Array} schedule An array of all the schedule items in the user's schedule we are analyzing.
 * @return {Object} Returns a hash of the time off durations formatted like:
 *
 * 	{
 * 		timeOff: Array, // an array of all the durations of times off
 * 		shifts: Array // an array of all the lengths of all the shifts during the schedule
 * 	}
 */
function getTimeOffDurations(startDate, endDate, schedule) {
	var durationsHash = { timeOff: [ ], shifts: [ ] };
	var scheduleLength = schedule.length;

	for (var i = 0; i < scheduleLength; ++i) {
		var timeOffDiff = 1, shiftDiff;

		// calculate the time between shifts using the start of the current shift diffed from
		// the end of the previous shift (don't do this for the first shift)
		if (i === 0) {
			timeOffDiff = timeDiff(schedule[i].startDate, startDate);
		} else {
			timeOffDiff = timeDiff(schedule[i].startDate, schedule[i - 1].endDate);
		}
		durationsHash.timeOff.push(timeOffDiff);
		if (i === scheduleLength - 1) {
			timeOffDiff = timeDiff(endDate, schedule[i - 1].endDate);
			durationsHash.timeOff.push(timeOffDiff);
		}

		// diff the end of the current shift from the beggining of the current shift
		shiftDiff = timeDiff(schedule[i].endDate, schedule[i].startDate);
		durationsHash.shifts.push(shiftDiff);
	}

	return durationsHash;
}

/**
 * Finds all times off that were too short, and if there were any will return indexes pointing to the shifts that
 * started too early.
 * 
 * @method discoverShortTimeOff
 * @param {Object} durationsHash The durations hash calculated by `getTimeOffDurations`.
 * @return {Boolean/Array} Returns either false if there were no durations that were too short or an array of numbers that
 * point to indeces in the original schedule array of offending schedule items.
 */
function discoverShortTimeOff(durationsHash) {
	return _(durationsHash.timeOff.slice(1, durationsHash.timeOff.length - 1)).reduce(function (memo, duration, index) {
		if (duration < DUTYHOURS.config.invalidHours.timeOffBetween) {
			memo.push(index + 1);
		}
		return memo;
	}, [ ]);
}

/**
 * Finds shifts that are designated as being too long.
 *
 * @method discoverLongShifts
 * @param {Object} durationsHash The durations hash calculated by `getTimeOffDurations`.
 * @return {Boolean/Array} Returns either false if there were no shifts that were too long or an array of numbers that
 * point to indeces in the original schedule array of offending schedule items.
 */
function discoverLongShifts(durationsHash) {
	return _(durationsHash.shifts).reduce(function (memo, shift, index) {
		if (shift > DUTYHOURS.config.invalidHours.shiftMaximumLength) {
			memo.push(index);
		}
		return memo;
	}, [ ]);
}

/**
 * Whether or not the user had enough time off.
 *
 * @method discoverEnoughTimeOff
 * @param {Object} durationsHash The durations hash calculated by `getTimeOffDurations`.
 * @return {Boolean} Returns true if the user had enough time off, false if not.
 */
function discoverEnoughTimeOff(durationsHash) {
	return (_(durationsHash.timeOff).reduce(function (memo, duration) {
		return Math.floor(duration / DUTYHOURS.config.invalidHours.daysOffLength);
	}, 0) >= DUTYHOURS.config.invalidHours.daysOffMonth);
}

/**
 * Discovers if the user worked too many average hours over the time period.
 *
 * @method discoverAverageHoursWorked
 * @param {Object} durationsHash The durations hash calculated by `getTimeOffDurations`.
 * @return {Boolean/Array} Returns either false if the user worked under the required average hours or an array of numbers that
 * point to indeces in the original schedule array of offending schedule items that put the user over the average.
 */
function discoverAverageHoursWorked(durationsHash) {
	var totalHoursWorkedHash = _(durationsHash.shifts).reduce(function (memo, shift, index) {
		memo.totalHours += shift;
		if (memo.totalHours > DUTYHOURS.config.invalidHours.hoursMonth) memo.offendingShifts.push(index);
		return memo;
	}, { totalHours: 0, offendingShifts: [ ] });

	return totalHoursWorkedHash.offendingShifts;
}
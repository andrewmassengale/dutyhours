var _ = require('underscore');
var async = require('async');
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

function timeDiff(t1, t2) {
	return moment(t1).diff(moment(t2), 'hours', true);
}

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

function discoverShortTimeOff(durationsHash) {
	return _(durationsHash.timeOff.slice(1, durationsHash.timeOff.length - 1)).reduce(function (memo, duration, index) {
		if (duration < DUTYHOURS.config.invalidHours.timeOffBetween) {
			memo.push(index + 1);
		}
		return memo;
	}, [ ]);
}

function discoverLongShifts(durationsHash) {
	return _(durationsHash.shifts).reduce(function (memo, shift, index) {
		if (shift > DUTYHOURS.config.invalidHours.shiftMaximumLength) {
			memo.push(index);
		}
		return memo;
	}, [ ]);
}

function discoverEnoughTimeOff(durationsHash) {
	return (_(durationsHash.timeOff).reduce(function (memo, duration) {
		return Math.floor(duration / DUTYHOURS.config.invalidHours.daysOffLength);
	}, 0) >= DUTYHOURS.config.invalidHours.daysOffMonth);
}

function discoverAverageHoursWorked(durationsHash) {
	var totalHoursWorkedHash = _(durationsHash.shifts).reduce(function (memo, shift, index) {
		memo.totalHours += shift;
		if (memo.totalHours > DUTYHOURS.config.invalidHours.hoursMonth) memo.offendingShifts.push(index);
		return memo;
	}, { totalHours: 0, offendingShifts: [ ] });

	return totalHoursWorkedHash.offendingShifts;
}
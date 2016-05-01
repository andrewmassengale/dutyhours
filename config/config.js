/*******************************************************
* Module to generate default configuration variables.
*******************************************************/

module.exports = {
	getDevelopmentConfig: function getDevelopmentConfig() {
		return {
			environment: 'development',
			port: 3000,
			mongoConnString: 'mongodb://localhost/DutyHours',
			invalidHours: {
				timeOffBetween: 8,
				hoursMonth: 320,
				daysOffLength: 24,
				daysOffMonth: 4,
				shiftMaximumLength: 24
			}
		};
	},

	getStagingConfig: function getStagingConfig() {
		return {
			environment: 'staging',
			port: 80,
			mongoConnString: 'mongodb://localhost/DutyHours',
			invalidHours: {
				timeOffBetween: 8,
				hoursMonth: 320,
				daysOffLength: 24,
				daysOffMonth: 4,
				shiftMaximumLength: 24
			}
		};
	},

	getProductionConfig: function getProductionConfig(){
		return {
			environment: 'production',
			port: 80,
			mongoConnString: 'mongodb://localhost/DutyHours',
			invalidHours: {
				timeOffBetween: 8,
				hoursMonth: 320,
				daysOffLength: 24,
				daysOffMonth: 4,
				shiftMaximumLength: 24
			}
		};
	}
};
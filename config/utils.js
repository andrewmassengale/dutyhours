module.exports.customRequire = function (dirname) {
	var path = require('path');
	var projectDir = dirname;

	GLOBAL.root_require = function (module) {
		return require(path.normalize(projectDir + module));
	};

	GLOBAL.module_require = function (module) {
		return root_require('/modules/' + module);
	};

	GLOBAL.config_require = function (module) {
		return root_require('/config/' + module);
	};

	GLOBAL.schema_require = function (module) {
		return root_require('/schema/' + module);
	};

	GLOBAL.routes_require = function (module) {
		return root_require('/routes/' + module);
	};
};

module.exports.checkMongoConnection = function checkConnection() {
	var userSchema = schema_require('userSchema');

	userSchema.findOne({}, function () { });
};
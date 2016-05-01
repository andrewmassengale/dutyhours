var userSchema = schema_require('UserSchema');

// param that retrieves and saves the user to the request object
exports.user = function (req, res, next, userID) {
	userSchema.findByUserID(userID, function (err, user) {
		if (err) return next(err);
		req.user = user;
		next();
	});
};
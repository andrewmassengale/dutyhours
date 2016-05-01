# Duty Hours App

This app is intended to be an API for the Duty Hours app.

## About the app

Currently, this app is set up to act as an API that can accomplish the following:

* Create users in the database
* Add schedule items to a user in the database
* Retrieve schedules for one or multiple users
* Analyze one or many user's schedules according to the project definitions

## Building the app

To build this app, you need node.js and MongoDB running on your machine.

Download the app, then run an `npm install` to install all of the dependencies.

Next, you need to get the Mongo database up and running. The database should have a DutyHours database in it with a `users` collection. The `config/config.js` file is where you would modify your connection string. I've included a dump of some test data you can use in the mongo/ folder. Simply run a mongoimport on the collections there.

## Testing the app

I've included an export of my Postman REST request, which you can import to run API calls against the app.

## Next steps

Some next steps I would take would be:

* Adding a layer of security to the users. Right now all of the passwords are stored in plaintext, which is very insecure. These should be salted and hashed.
* Adding a layer of security to the API calls, preferably via Passport.
var reminders = require('../db/reminders.json')
	,updatedR = false
	,utils = require('../utils/utils.js');

setInterval(() => {
	if (updatedR) {
		updatedR = false;
		utils.safeSave('db/reminders', '.json', JSON.stringify(reminders));
	}
}, 60000)

/*
Add Reminder:
	user: A user's ID
	date: The date in milliseconds
	text: The reminder to be sent
*/
exports.addReminder = function(user, date, text) {
	if (!user || !date || !text) return;
	reminders[date] = {"user": user, "text": text};
	updatedR = true;
};

exports.countForUser = function(user) {
	let count = 0;
	Object.keys(reminders).map(date => {
		if (reminders[date].user == user) count++;
	});
	return count;
};

exports.listForUser = function(user) {
	let list = [];
	Object.keys(reminders).map(date => {
		if (reminders[date].user == user) list.push(reminders[date].text+' **@** '+new Date(parseInt(date)).toUTCString());
	});
	return list;
};

exports.checkReminders = function(bot) {
	let now = Date.now();
	Object.keys(reminders).map(date => {
		if (date <= now) {
			let recipent = bot.users.get('id', reminders[date].user);
			if (recipent) bot.sendMessage(recipent, "⏰ **Reminder:** "+reminders[date].text);
			if (debug) console.log(cDebug(" DEBUG ") + " Reminded user");
			delete reminders[date];
			updatedR = true;
		}
	});
};

/*
Remove Reminder:
	user: A user's ID
	text: The reminder to be removed
	success: function to run on completion
	fail: function to run if not found
*/
exports.removeReminder = function(text, user, success, fail) {
	if (!text || !user) return;
	let found = false;
	Object.keys(reminders).map(t => {
		if (found) return;
		if (reminders[t].user == user && reminders[t].text.includes(text)) {
			delete reminders[t];
			updatedR = true;
			if (debug) console.log(cDebug(" DEBUG ") + " Removed reminder for user " + user);
			found = true;
		}
	});
	if (found && typeof success == 'function') success();
	else if (!found && typeof fail == 'function') fail();
};

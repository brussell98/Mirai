module.exports = function(config) {
	if (!config.token) {
		console.log(cError(" CONFIG ERROR ") + " Bot token is not defined");
		process.exit(0);
	}
	if (config.prefix === undefined) {
		console.log(cError(" CONFIG ERROR ") + " Command prefix is not defined");
		process.exit(0);
	}
	if (config.modPrefix === undefined) {
		console.log(cError(" CONFIG ERROR ") + " Mod command prefix is not defined");
		process.exit(0);
	}
	if (!config.adminIds || config.adminIds.length < 1) {
		console.log(cError(" CONFIG ERROR ") + " You must specify at least one admin id");
		process.exit(0);
	} else if (typeof config.adminIds[0] !== 'string' || config.adminIds[0] === "") {
		console.log(cError(" CONFIG ERROR ") + " Admin ID needs to be a string");
		process.exit(0);
	}
	if (!config.inviteLink)
		console.log(cWarn(" CONFIG WARNING ") + " Invite link is not defined");
	if (config.alowUserGames === undefined)
		console.log(cWarn(" CONFIG WARNING ") + " allowUserGames is not defined");
	if (!config.inviteLink)
		console.log(cWarn(" CONFIG WARNING ") + " Invite link is not defined");
	if (!config.inviteLink)
		console.log(cWarn(" CONFIG WARNING ") + " Invite link is not defined");
	if (!config.inviteLink)
		console.log(cWarn(" CONFIG WARNING ") + " Invite link is not defined");
	if (!config.inviteLink)
		console.log(cWarn(" CONFIG WARNING ") + " Invite link is not defined");
	if (!config.inviteLink)
		console.log(cWarn(" CONFIG WARNING ") + " Invite link is not defined");
	if (!config.inviteLink)
		console.log(cWarn(" CONFIG WARNING ") + " Invite link is not defined");
}

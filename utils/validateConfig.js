module.exports = function(config) {
	if (!config.token) {
		console.log(cError(" CONFIG ERROR ") + " Bot token is not defined");
		process.exit(0);
	}
	//Check for invalid command sets
	for (let prefix in config.commandSets) {
		if (prefix == "") {
			console.log(cError(" CONFIG ERROR ") + " One of your commandSets has no prefix");
			process.exit(0);
		} else if (typeof config.commandSets[prefix] !== 'string' || config.commandSets[prefix] === "") {
			console.log(`${cError(" CONFIG ERROR ")} Your path for commandSet '${prefix}' is invalid`);
			process.exit(0);
		}
	}
	if (!config.adminIds || config.adminIds.length < 1) {
		console.log(cError(" CONFIG ERROR ") + " You must specify at least one admin id");
		process.exit(0);
	} else if (typeof config.adminIds[0] !== 'string' || config.adminIds[0] === "") {
		console.log(cError(" CONFIG ERROR ") + " Admin ID needs to be a string");
		process.exit(0);
	}
	if (typeof config.reloadCommand !== 'string' || config.reloadCommand === "") {
		console.log(cError(" CONFIG ERROR ") + " The reloadCommand needs to be a string");
		process.exit(0);
	}
	if (typeof config.evalCommand !== 'string' || config.evalCommand === "") {
		console.log(cError(" CONFIG ERROR ") + " The evalCommand needs to be a string");
		process.exit(0);
	}
	if (!config.inviteLink)
		console.log(cWarn(" CONFIG WARNING ") + " Invite link is not defined");
	if (config.allowUserGames === undefined)
		console.log(cWarn(" CONFIG WARNING ") + " allowUserGames is not defined");
	if (typeof config.cleverbot !== 'boolean')
		console.log(cWarn(" CONFIG WARNING ") + " cleverbot must be set to true or false");
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

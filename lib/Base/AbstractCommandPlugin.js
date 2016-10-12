class AbstractCommandPlugin {
	constructor() {
		if (this.constructor === AbstractCommandPlugin)
			throw new Error("Can't instantiate abstract class!");
	}

	get help() {
		return;
	}

	load(bot) {
		this.bot = bot;
	}

	handle() {
		throw new Error('Handle must be overwritten');
	}
}

module.exports = AbstractCommandPlugin;

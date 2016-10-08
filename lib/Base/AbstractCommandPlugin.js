class AbstractCommandPlugin {
	constructor(bot) {
		if (this.constructor === AbstractCommandPlugin)
			throw new Error("Can't instantiate abstract class!");

		this.bot = bot;
	}

	handle() {
		throw new Error('Handle must be overwritten');
	}
}

module.exports = AbstractCommandPlugin;

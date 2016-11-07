class AbstractCommandPlugin {
	constructor() {
		if (this.constructor === AbstractCommandPlugin)
			throw new Error("Can't instantiate an abstract class!");
	}

	get help() {
		return;
	}

	get name() {
		throw new Error('name must be overwritten');
	}

	load(bot) {
		this.bot = bot;
		return Promise.resolve(this);
	}

	destroy() {
		this.bot = undefined;
		return Promise.resolve();
	}

	handle() {
		throw new Error('handle must be overwritten');
	}
}

module.exports = AbstractCommandPlugin;

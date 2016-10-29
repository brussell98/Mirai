class Logger {
	constructor() { }

	log(text) { console.log(text); }

	info(text) { console.info(text); } // TODO: Blue info text

	debug(text) { console.log(text); } // TODO: Grey debug text

	warn(text) { console.warn(text); } // TODO: Orange warn text

	error(text) { console.error(text); } // TODO: Red error text
}

module.exports = Logger;

var chalk = require('chalk');
var enabled = new chalk.constructor({enabled: true});

exports.cWarn = function (text) { 
	return chalk.styles.bgYellow.open + 
	chalk.styles.black.open + 
	text + 
	chalk.styles.black.close + 
	chalk.styles.bgYellow.close + 
	" "+chalk.reset('');
};
																  
exports.cError = function (text) { 
	return chalk.styles.bgRed.open + 
	chalk.styles.black.open +
	text + 
	chalk.styles.bgRed.close + 
	chalk.styles.black.close + 
	" "+chalk.reset('');
};
																  
exports.cDebug = function (text) { 
	return chalk.styles.bgWhite.open + 
	chalk.styles.black.open + 
	text + 
	chalk.styles.bgWhite.close + 
	chalk.styles.black.close + 
	" "+chalk.reset('');
};

exports.cGreen = function (text) { 
	return chalk.styles.green.open + 
	chalk.styles.bold.open + 
	text + 
	chalk.styles.bold.close + 
	chalk.styles.green.close+chalk.reset('');
};

exports.cGrey = function (text) { 
	return chalk.styles.grey.open + 
	chalk.styles.bold.open + 
	text + 
	chalk.styles.grey.close + 
	chalk.styles.bold.close+chalk.reset('');
};

exports.cYellow = function (text) { 
	return chalk.styles.yellow.open + 
	chalk.styles.bold.open + 
	text + 
	chalk.styles.yellow.close + 
	chalk.styles.bold.close+chalk.reset('');
};
	
exports.cRed = function (text) { 
	return chalk.styles.red.open + 
	chalk.styles.bold.open + 
	text + 
	chalk.styles.red.close + 
	chalk.styles.bold.close+chalk.reset('');
};

exports.cServer = function (text) { 
	return chalk.styles.cyan.open + 
	chalk.styles.bold.open + 
	text + 
	chalk.styles.cyan.close + 
	chalk.styles.bold.close+chalk.reset('');
};

exports.cUYellow = function (text) { 
	return chalk.styles.yellow.open + 
	chalk.styles.underline.open + 
	chalk.styles.bold.open + 
	text + 
	chalk.styles.yellow.close +
	chalk.styles.underline.close + 
	chalk.styles.bold.close+chalk.reset('');
};

exports.cBgGreen = function (text) { 
	return chalk.styles.bgGreen.open + 
	chalk.styles.black.open + 
	text + 
	chalk.styles.bgGreen.close + 
	chalk.styles.black.close+chalk.reset('');
};

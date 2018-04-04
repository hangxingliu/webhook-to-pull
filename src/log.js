//@ts-check

let chalk = require('chalk').default;

const recentSize = 128;
let recentLog = new Array(recentSize),
	recentIndex = 0,
	recentFull = false;

module.exports = {
	normal,
	info,
	warn,
	error,
	getRecentLog,
	fatal: (content, reason) => error(content, reason, true)
};

function getPrefix(type) {
	return `${type} ${new Date().toJSON()}  `;
}

function push2recent(content) {
	recentLog[recentIndex] = content;
	recentIndex++;
	if (recentIndex >= recentSize) {
		recentIndex = 0;
		recentFull = true;
	}
}

function getRecentLog() {
	if (recentFull)
		return recentLog.slice(recentIndex).concat(recentLog.slice(0, recentIndex));
	return recentLog.slice(0, recentIndex);
}

/**
 * @param {string} content
 */
function normal(content) {
	content = getPrefix('LOG') + content;
	console.log(content);
	push2recent(content);
}

/**
 * @param {string} content
 */
function info(content) {
	content = getPrefix('INFO') + content;
	console.log(chalk.blue(content));
	push2recent(content);
}

/**
 * @param {string} content
 */
function warn(content) {
	content = getPrefix('WARN') + content;
	console.log(chalk.yellow(content));
	push2recent(content);
}

/**
 * @param {string} content
 * @param {Error} [reason]
 */
function error(content, reason = null, fatal = false) {
	let prefix = getPrefix('ERROR');
	content = prefix + content;
	console.error(chalk.red.bold(content));
	push2recent(content);

	if (reason) {
		let message = reason.stack || reason.message || String(reason);
		message.split('\n').forEach(line => {
			line = prefix + '  ' +content;
			console.error(chalk.red(content));
			push2recent(content);
		})
	}

	if (fatal) process.exit(1);
}

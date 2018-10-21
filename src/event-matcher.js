//@ts-check
const config = require('./config-loader');

module.exports = { isEventMatched };

/**
 * @param {string[]} expectedEvents
 * @param {string} actualEvent
 * @param {string} type
 */
function isEventMatched(expectedEvents, actualEvent, type) {
	if (expectedEvents.indexOf('*') >= 0) return true;

	if (type === config.TYPE_BITBUCKET) {
		const repoPrefix = 'repo:';
		if (expectedEvents.indexOf(actualEvent) >= 0) return true;
		if (actualEvent.startsWith(repoPrefix))
			return expectedEvents.indexOf(actualEvent.slice(repoPrefix.length)) >= 0;
		return false;
	}

	if (type === config.TYPE_GITLAB) {
		if (expectedEvents.indexOf(actualEvent) >= 0) return true;

		const lowercaseActualEvent = actualEvent.toLowerCase();
		if (expectedEvents.indexOf(lowercaseActualEvent) >= 0) return true;

		if (lowercaseActualEvent.endsWith(' hook')) {
			// ' hook'.length === 5
			const lastTry = lowercaseActualEvent.slice(0, lowercaseActualEvent.length - 5);
			return expectedEvents.indexOf(lastTry) >= 0;
		}
	}
	return expectedEvents.indexOf(actualEvent) >= 0;
}

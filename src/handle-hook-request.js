//@ts-check
/// <reference path="./index.d.ts" />

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const log = require('./log');
const config = require('./config-loader');
const verify = require('./request-verify');

const GIT = path.join(__dirname, 'git.sh');

/** @type {{[x: string]: {signature?: string; event: string; delivery?: string;}}} */
const HEADER_NAMES = {
	github: {
		signature: 'x-hub-signature',
		event: 'x-github-event',
		delivery: 'x-github-delivery',
	},
	gitlab: {
		signature: 'x-gitlab-token',
		event: 'x-gitlab-event',
	},
	gogs: {
		signature: 'x-gogs-signature',
		event: 'x-gogs-event',
		delivery: 'x-gogs-delivery',
	},
	bitbucket: {
		event: 'x-event-key',
		delivery: 'x-request-uuid',
	},
	gitea: {
		event: 'x-gitea-event',
		delivery: 'x-gitea-delivery',
	},
	'coding.net': {
		event: 'x-coding-event',
		delivery: 'x-coding-delivery',
		signature: 'x-coding-signature',
	},
	'gitee.com': {
		event: 'x-gitee-event',
		delivery: 'x-gitee-event',
		signature: 'x-gitee-token',
	},
};

module.exports = { handle };

/** @param {string[]} strings */
function escapedShellString(strings) {
	return strings.map(str => "'" + str.replace(/'/g, "'\\''") + "'");
}


/**
 * @param {{[name: string]: string}} queryStrings
 * @param {{[name: string]: string|string[]}} headers
 * @param {Buffer} body
 * @returns {Promise<{status: number; message: string}>}
 */
function handle(queryStrings, headers, body) {
	/** @type {WebhookRequestBody} */
	let requestBody = safeParseJson(body);
	if (config.get().dump)
		dumpLogs(queryStrings, headers, requestBody);

	if (!requestBody)
		return invalidRequest('invalid request body (it is not a json)');

	if (!requestBody.repository)
		return invalidRequest('invalid request body (empty `repository`)');

	/** @type {Set<string>} */
	const maybeRepoNames = new Set();

	if (typeof requestBody.repository.full_name === 'string')
		maybeRepoNames.add(requestBody.repository.full_name);

	if (typeof requestBody.repository.path_with_namespace === 'string')
		maybeRepoNames.add(requestBody.repository.path_with_namespace);

	if (requestBody.project &&
		typeof requestBody.project.path_with_namespace === 'string')
		maybeRepoNames.add(requestBody.project.path_with_namespace);

	if (maybeRepoNames.size === 0) {
		return invalidRequest('invalid request body (can not find repo name string from: ' +
			'`repository.full_name`, ' +
			'`repository.path_with_namespace`, ' +
			'`project.path_with_namespace`' + ')');
	}


	const repositories = config.get().repositories;
	let repoName = '';
	for (const tryRepoName of maybeRepoNames) {
		if (Object.prototype.hasOwnProperty.call(repositories, tryRepoName)) {
			repoName = tryRepoName;
			break;
		}
	}
	if (!repoName) {
		const names = Array.from(maybeRepoNames).map(it => `"${it}"`);
		const be = names.length > 1 ? 'are' : 'is';
		return invalidRequest(`${names.join(', ')} ${be} not defined in config`);
	}

	const repoConfig = repositories[repoName];
	const { secret, type } = repoConfig;
	const headerNames = HEADER_NAMES[type];

	const fromBitbucket = (type === config.TYPE_BITBUCKET);
	const fromGitea = (type === config.TYPE_GITEA);
	const fromGitlab = (type === config.TYPE_GITLAB);

	let signature = '';
	if (fromBitbucket) {
		signature = pickAnyOf(queryStrings, 'secret', 'token');
		if(!signature)
			return invalidRequest(`query string is not included "secret" or "token"`);

	} else if (fromGitea) {
		signature = String(requestBody['secret']);
		if(!signature)
			return invalidRequest(`body is not included "secret" field`);

	} else {
		signature = String(headers[headerNames.signature]);;
		if(!signature)
			return invalidRequest(`header ${headerNames.signature} is empty`);
	}

	const event = String(headers[headerNames.event]);
	const delivery = fromGitlab ? 'gitlab' : String(headers[headerNames.delivery]);
	if (!event)
		return invalidRequest(`header ${headerNames.event} is empty`);
	if (!delivery)
		return invalidRequest(`header ${headerNames.delivery} is empty`);

	let verifyMethod = null;
	switch (type) {
		case config.TYPE_GOGS:
			verifyMethod = verify.gogs;
			break;
		case config.TYPE_BITBUCKET:
		case config.TYPE_GITEE_COM:
		case config.TYPE_GITEA:
		case config.TYPE_GITLAB:
			verifyMethod = verify.bitbucket_gitee_gitea_gitlab;
			break;
		default:
			// coding.net use verify method same as github
			verifyMethod = verify.github;
	}


	let verified = verifyMethod(signature, body, secret);
	if (!verified)
		return invalidRequest(`invalid signature!`);

	let headCommit = 'Unknown head commit';
	if (requestBody.head_commit) {
		let head = requestBody.head_commit;
		headCommit = `${head.id.slice(0, 7)} ${JSON.stringify(head.message.split('\n')[0])}`;
	}
	log.info(`received verified hook request: ${event} ${repoName} (${headCommit})`);
	log.info(`webhook delivery id: ${delivery}`);

	if (!isEventMatched(repoConfig.events, String(event), type)) {
		log.warn(`ignore this event, because it is not included in ${JSON.stringify(repoConfig.events)}`);
		return Promise.resolve({ status: 200, message: "ok! (but ignored this event)" });
	}

	log.info(`git pulling in ${repoConfig.local} ...`);
	return gitPull(repoConfig);
}

/** @param {ConfigRepo} repoConfig */
function gitPull(repoConfig) {
	let cmd = 'bash ' + escapedShellString([
		GIT, 'pull',
		repoConfig.local, repoConfig.remote, repoConfig.branch,
	].concat(repoConfig.afterPull ? [repoConfig.afterPull] : [])).join(' ');
	return new Promise((resolve) => {
		let resolved = false;
		const resolveOnce = (result) => {
			if (resolved) return;
			resolved = true;
			resolve(result);
		};

		exec(cmd, (error, stdout, stderr) => {
			if (error) {
				log.error(`git pull failed!`, error);
				('stdout:\n' + String(stdout) + '\nstderr:\n' + String(stderr))
					.split('\n').forEach(line => log.error(line));
				return resolveOnce({ status: 500, message: 'git pull failed!' });
			}

			let headCommitMtx = String(stdout).match(/HEAD_COMMIT=(\w+)/);
			let headCommit = headCommitMtx ? headCommitMtx[1] : 'Unknown';
			log.info(`git pull done! (head commit hash: ${headCommit}  repo: ${repoConfig.local})`);
			return resolveOnce({ status: 200, message: `ok! (local HEAD: ${headCommit})` });
		});

		if (repoConfig.async)
			return resolveOnce({ status: 200, message: 'ok! (git pull asynchronous)' });
	});
}

function invalidRequest(message = 'Bad Request') {
	log.warn(`Invalid request: ${message}`);
	return Promise.resolve({ status: 400, message });
}

function safeParseJson(json) {
	try {
		return JSON.parse(json);
	} catch (ex) {
		log.warn(`Exception be thrown in safeParseJson `);
	}
}

/** @returns {string} */
function pickAnyOf(queryStrings, ...names) {
	if (!queryStrings) return;
	for (let name of names) {
		if (Object.prototype.hasOwnProperty.call(queryStrings, name))
			return queryStrings[name];
	}
}

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


let dumpLogsLock = false;
function dumpLogs(queryStrings, headers, body) {
	if (dumpLogsLock) return;
	dumpLogsLock = true;

	const DIR = path.join(__dirname, '..', 'logs');
	try {
		if (!fs.existsSync(DIR))
			fs.mkdirSync(DIR);
		const targetFile = path.join(DIR, `${new Date().toJSON()}.json`);
		fs.writeFileSync(targetFile, JSON.stringify({ queryStrings, headers, body }, null, '\t'));
		log.info(`dump request to log file: ${targetFile}`);
	} catch (ex) {
		log.warn('dump request to log file failed!');
	}

	dumpLogsLock = false;
}

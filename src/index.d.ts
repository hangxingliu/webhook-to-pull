type Config = {
	port: number;
	dump: boolean;
	repositories: { [name: string]: ConfigRepo };
};

type ConfigRepo = {
	local: string;
	secret: string;
	branch: string;
	remote: string;
	type: string;
	events: string[];
	async: boolean;
	afterPull: string;
};

type WebhookRequestBody = {
	head_commit?: {
		id: string;
		message: string;
	};

	repository: {
		full_name: string
		path_with_namespace?: string;
	};
};

type VerifyFunction = (actual: string, rawBody: Buffer, secret: string) => boolean;

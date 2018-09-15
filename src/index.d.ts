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
};

type GithubResponse = {
	head_commit?: {
		id: string;
		message: string;
	};

	repository: {
		full_name: string
	};
};

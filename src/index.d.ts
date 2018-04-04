type Config = {
	port: number;
	repositories: ConfigRepo[];
};

type ConfigRepo = {
	repo: string;
	local: string;
	secert: string;
	branch: string;
	remote: string;
	events: string[];
};

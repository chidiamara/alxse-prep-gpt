    export type PageData = {
        url: string;
        title: string;
        content: string;
        links?: string;
        teamMembers?: TeamMember[];
        topics?: Topics[];
        tokens: number;
        chunks: ScrapedChunks[];
    }

    export type TeamMember = {
        name: string;
        role: string;
        imageSrc: string;
        tokens: number;
        socials: {
            linkedin?: string;
            twitter?: string;
            youtube?: string;
        };
    }

    export type Topics = {
        heading?: string;
        [key: string]: string | undefined;
    }


    export type ScrapedData = {
        pages: PageData[];
        // teamMembers?: TeamMember[];
        chunks?: ScrapedChunks[];
        tokens: ScrapedChunks["contentTokens"];
    }

    export type ScrapedChunks = {
        title: string;
        content: string;
        links: string;
        teamMembers: TeamMember[];
        topics: Topics[];
        contentLength: number;
        contentTokens: number;
        embedding: number[];
    }
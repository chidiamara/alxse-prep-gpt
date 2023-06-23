import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import { encode } from 'gpt-3-encoder';

interface PageData {
  url: string;
  title: string;
  content: string;
  links?: string;
  teamMembers?: TeamMember[];
  topics?: Table[];
  tokens: number;
}

interface TeamMember {
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

interface Table {
  heading?: string;
  [key: string]: string | undefined;
  tokens?: string;
}

interface ScrapedData {
  pages: PageData[];
  teamMembers?: TeamMember[];
  chunks?: ScrapedChunks[];
  tokens: number;
}

interface ScrapedChunks {
  title: string;
  content: string;
  links: string;
  teamMembers: TeamMember[];
  topics: Table[];
  contentLength: number;
  contentTokens: number;
  embedding: number[];
}

const ChunkSize = 200;

const mainUrl = 'https://prealxse.com';

const pageUrls = [
  '/intro/',
  '/category/what-is-alx-se/',
  '/introduction/',
  '/introduction/topics/',
  '/introduction/framework/',
  '/introduction/pbl/',
  '/introduction/pld/',
  '/introduction/must_know/',
  '/introduction/evaluation/',
  '/introduction/faqs/',
  '/category/community/',
  '/Community/',
  '/category/mindset-prep/',
  '/mindset/videos/',
  '/mindset/articles/',
  '/mindset/tweets/',
  '/category/tech-prep',
  '/guide/',
  '/guide/Apps/',
  '/guide/Apps/quiz/',
  '/guide/concepts/',
  '/guide/concepts/shell/',
  '/guide/concepts/shell/quiz/',
  '/guide/concepts/text-editors/',
  '/guide/concepts/text-editors/quiz/',
  '/guide/concepts/version-control/',
  '/guide/concepts/version-control/quiz',
  '/guide/concepts/c-programming/'
];

const fetchHTML = async (url: string): Promise<string> => {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching HTML from ${url}:`, error);
    throw error;
  }
};

const parsePageHTML = (html: string, url: string): PageData => {
  const $ = cheerio.load(html);
  const title = $('h1').text().trim();
  const content = $('h2, h3, p')
    .map((index, element) => $(element).text().trim())
    .get()
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\.([a-zA-Z])/g, '. $1');
  const links = $('a[rel="noopener noreferrer"]')
    .map((index, element) => $(element).attr('href'))
    .get()
    .join(' ');

  const pageData: PageData = {
    url: mainUrl + url,
    title,
    content,
    links,
    tokens: encode(title).length + encode(content).length + encode(links).length,
  };

  return pageData;
};

const parseTeamHTML = (html: string): TeamMember[] => {
  const $ = cheerio.load(html);
  const teamMembers: TeamMember[] = [];

  const names = $('table thead tr th')
    .map((index, element) => $(element).text().trim())
    .get();
  const roles = $('table tbody tr:nth-child(2) td')
    .map((index, element) => $(element).text().trim())
    .get();
  const imageSrcs = $('table tbody tr:nth-child(1) td img')
    .map((index, element) => $(element).attr('a'))
    .get();
  const socialRows = $('table tbody tr:nth-child(3) td');

  for (let i = 0; i < names.length; i++) {
    const socials: TeamMember['socials'] = {};

    const socialLinks = $(socialRows[i]).find('a');
    socialLinks.each((index, element) => {
      const anchor = $(element);
      const socialName = anchor.text().trim().toLowerCase();
      const socialLink = anchor.attr('href');

      if (socialName && socialLink) {
        socials[socialName as keyof TeamMember['socials']] =
          socialLink[0] === '/' ? mainUrl + socialLink : socialLink;
      }
    });

    const teamMember: TeamMember = {
      name: names[i],
      role: roles[i],
      imageSrc: imageSrcs[i],
      socials,
      tokens:
        encode(names[i]).length +
        encode(roles[i]).length +
        // + encode(imageSrcs[i]).length
        encode(Object.values(socials).join(' ')).length,
    };

    teamMembers.push(teamMember);
  }

  return teamMembers;
};

const parseTopicsHTML = (html: string): Table[] => {
  const $ = cheerio.load(html);
  const tables = $('table');
  const topics: Table[] = [];

  tables.each((tableIndex, table) => {
    const tableTopics: Table[] = [];

    const headingRow = $(table).find('thead tr');
    const topicRows = $(table).find('tbody tr');

    const headings = headingRow
      .find('th')
      .map((index, element) => $(element).text().trim())
      .get();

    topicRows.each((index, row) => {
      const columns = $(row).find('td');

      const topic: Table = {};
      columns.each((index, column) => {
        const heading = headings[index];
        const value = $(column).text().trim();
        topic[heading] = value;
        const tokens: number =
          encode(heading).length + encode(value).length;
        topic['tokens'] = tokens.toString();
      });

      tableTopics.push(topic);
    });

    topics.push(...tableTopics);
  });

  // Add interview preparation topics
  const interviewPreparationHeading = $('h3#interview-preparation');
  const interviewPreparationList = interviewPreparationHeading.next('ul');
  const interviewPreparationTopics = interviewPreparationList.find('li');

  const interviewPreparationData: Table = {
    concept: interviewPreparationHeading.text().trim(),
    tokens: `${encode(interviewPreparationHeading.text().trim()).length.toString()}
              ${encode(interviewPreparationList.text().trim()).length.toString()}`
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\n/g, ''),
  };

  interviewPreparationTopics.each((index, topic) => {
    interviewPreparationData[`Topic ${index + 1}`] = $(topic).text().trim();
  });

  topics.push(interviewPreparationData);

  return topics;
};

const scrapePages = async (urls: string[]): Promise<PageData[]> => {
  const pages: PageData[] = [];

  for (const url of urls) {
    const html = await fetchHTML(mainUrl + url);
    const pageData = parsePageHTML(html, url);
    pages.push(pageData);
  }

  return pages;
};

const scrapeTeamMembers = async (): Promise<TeamMember[]> => {
  const teamUrl = '/community/';

  const html = await fetchHTML(mainUrl + teamUrl);
  const teamMembers = parseTeamHTML(html);

  return teamMembers;
};

const scrapeTopics = async (): Promise<Table[]> => {
  const topicsUrl = '/introduction/topics/';

  const html = await fetchHTML(mainUrl + topicsUrl);
  const topics = parseTopicsHTML(html);

  return topics;
};

const chunkData = (data: ScrapedData): ScrapedChunks[] => {
  const { pages, teamMembers, tokens } = data;
  const chunks: ScrapedChunks[] = [];

  let titleChunk = '';
  let contentChunk = '';
  let linksChunk = '';
  let teamMembersChunk: TeamMember[] = [];
  let topicsChunk: Table[] = [];
  let contentLength = 0;
  let contentTokens = 0;

  for (const page of pages) {
    const { title, content, links } = page;
    const pageTokens = page.tokens;

    if (
      titleChunk.length + encode(title).length > ChunkSize ||
      contentChunk.length + encode(content).length > ChunkSize ||
      (links && linksChunk.length + encode(links).length > ChunkSize)
    ) {
      chunks.push({
        title: titleChunk.trim(),
        content: contentChunk.trim(),
        links: linksChunk.trim(),
        teamMembers: teamMembersChunk,
        topics: topicsChunk,
        contentLength,
        contentTokens,
        embedding: [],
      });

      titleChunk = '';
      contentChunk = '';
      linksChunk = '';
      teamMembersChunk = [];
      topicsChunk = [];
      contentLength = 0;
      contentTokens = 0;
    }

    titleChunk += ` ${title}`;
    contentChunk += ` ${content}`;
    linksChunk += ` ${links}`;
    contentLength += content.length;
    contentTokens += pageTokens;

    if (teamMembers) {
      for (const teamMember of teamMembers) {
        teamMembersChunk.push(teamMember);
      }
    }

    if (page.teamMembers) {
      for (const teamMember of page.teamMembers) {
        teamMembersChunk.push(teamMember);
      }
    }

    if (page.topics) {
      for (const topic of page.topics) {
        topicsChunk.push(topic);
      }
    }
  }

  // Push the remaining chunk if any
  if (
    titleChunk.length > 0 ||
    contentChunk.length > 0 ||
    linksChunk.length > 0 ||
    teamMembersChunk.length > 0 ||
    topicsChunk.length > 0
  ) {
    chunks.push({
      title: titleChunk.trim(),
      content: contentChunk.trim(),
      links: linksChunk.trim(),
      teamMembers: teamMembersChunk,
      topics: topicsChunk,
      contentLength,
      contentTokens,
      embedding: [],
    });
  }

  return chunks;
};

const scrapeAllData = async (): Promise<ScrapedData> => {
  const [pages, teamMembers, topics] = await Promise.all([
    scrapePages(pageUrls),
    scrapeTeamMembers(),
    scrapeTopics(),
  ]);

  const totalTokens =
  pages.reduce((total, page) => total + page.tokens, 0) +
  (teamMembers
    ? teamMembers.reduce((total, member) => total + member.tokens, 0)
    : 0) +
  (topics
    ? topics.reduce(
        (total, topic) => total + (topic.tokens ? parseInt(topic.tokens, 10) : 0),
        0
      )
    : 0);

  const data: ScrapedData = {
    pages,
    teamMembers,
    tokens: totalTokens,
  };

  data.chunks = chunkData(data);

  return data;
};

const saveDataToFile = (data: ScrapedData, filename: string): void => {
  const jsonData = JSON.stringify(data, null, 2);

  fs.writeFile(filename, jsonData, (err) => {
    if (err) {
      console.error(`Error writing data to file ${filename}:`, err);
    } else {
      console.log(`Data saved to file ${filename}`);
    }
  });
};

scrapeAllData()
  .then((data) => {
    saveDataToFile(data, 'scraped_data.json');
  })
  .catch((error) => {
    console.error('Error scraping data:', error);
  });

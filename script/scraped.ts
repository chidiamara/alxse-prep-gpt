import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import { encode } from 'gpt-3-encoder';
import * as types from '../types/types';
import { mainUrl, pageUrls } from '../script/allUrls';

// interface PrealxseJSON = {
//     length: number;
//     tokens: number;
//     alxseData: ScrapedData;
//   };

const ChunkSize = 200;

const fetchHTML = async (url: string): Promise<string> => {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching HTML from ${url}:`, error);
    throw error;
  }
};

const parsePageHTML = (html: string, url: string): types.PageData => {
  const $ = cheerio.load(html);
  const title = $('h1')
                .text().trim();
  const content = $('h2, h3, p')
                  .map((index, element) => $(element).text().trim())
                  .get().join(' ').replace(/\s+/g, ' ').replace(/\.([a-zA-Z])/g, ". $1");
  const links = $('a[rel="noopener noreferrer"]')
                .map((index, element) => $(element).attr('href'))
                .get().join(' ');

  const pageData: types.PageData = {
    url: mainUrl + url,
    title,
    content,
    links,
    chunks: [],
    tokens: encode(title).length + encode(content).length + encode(links).length,
  };

  return pageData;
};

const parseTeamHTML = (html: string): types.TeamMember[] => {
  const $ = cheerio.load(html);
  const teamMembers: types.TeamMember[] = [];

  const names = $('table thead tr th')
                .map((index, element) => $(element).text().trim()).get();
  const roles = $('table tbody tr:nth-child(2) td')
                .map((index, element) => $(element).text().trim()).get();
  const imageSrcs = $('table tbody tr:nth-child(1) td img')
                    .map((index, element) => $(element).attr('a')).get();
  const socialRows = $('table tbody tr:nth-child(3) td');

  for (let i = 0; i < names.length; i++) {
    const socials: types.TeamMember['socials'] = {};

    const socialLinks = $(socialRows[i]).find('a');
    socialLinks.each((index, element) => {
      const anchor = $(element);
      const socialName = anchor.text().trim().toLowerCase();
      const socialLink = anchor.attr('href');

      if (socialName && socialLink) {
        socials[socialName as keyof types.TeamMember['socials']]
        = socialLink[0] === '/'
          ? mainUrl + socialLink
          : socialLink;
      }
    });

    const teamMember: types.TeamMember = {
      name: names[i],
      role: roles[i],
      imageSrc: imageSrcs[i],
      socials,
      tokens: encode(names[i]).length +
              encode(roles[i]).length +
              encode(Object.values(socials).join(' ')).length,
    };

    teamMembers.push(teamMember);
  }

  return teamMembers;
};

const parseTopicsHTML = (html: string): types.Topics[] => {
    const $ = cheerio.load(html);
    const tables = $('table');
    const topics: types.Topics[] = [];

    tables.each((tableIndex, table) => {
      const tableTopics: types.Topics[] = [];

      const headingRow = $(table).find('thead tr');
      const topicRows = $(table).find('tbody tr');

      const headings = headingRow.find('th')
                      .map((index, element) => $(element).text().trim()).get();

      topicRows.each((index, row) => {
        const columns = $(row).find('td');

        const topic: types.Topics = {};
        columns.each((index, column) => {
          const heading = headings[index];
          const value = $(column).text().trim();
          topic[heading] = value;
          const tokens: number = encode(heading).length + encode(value).length;
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

  const interviewPreparationData: types.Topics = {
    concept: interviewPreparationHeading.text().trim(),
    tokens: `${encode(interviewPreparationHeading.text().trim()).length.toString()}
              ${encode(interviewPreparationList.text().trim()).length.toString()}`.trim()
              .replace(/\s+/g, ' ')
              .replace(/\n/g, '')
  };

  interviewPreparationTopics.each((index, topic) => {
    interviewPreparationData[`Topic ${index + 1}`] = $(topic).text().trim();
  });

  topics.push(interviewPreparationData);

    return topics;
  };


  const dataChunks = async (pageData: types.PageData) => {
    const { title, url, content, links } = pageData;
    // const { content } = pageData;

    let pageTextChunks: string[] = [];

    if (encode(content).length + encode(title).length > ChunkSize) {
      const split = title + content.split(". ");
      let chunkText = "";

      for (let i = 0; i < split.length; i++) {
        const sentence = split[i];
        const sentenceTokenLength = encode(sentence);
        const chunkTextTokenLength = encode(chunkText).length;

        if (chunkTextTokenLength + sentenceTokenLength.length > ChunkSize) {
          pageTextChunks.push(chunkText);
          chunkText = "";
        }

        if (sentence[sentence.length - 1].match(/[a-z0-9]/i)) {
          chunkText += sentence + ". ";
        } else {
          chunkText += sentence + " ";
        }
      }

      pageTextChunks.push(chunkText.trim());
    } else {
      pageTextChunks.push(content.trim());
    }

    const pageChunks = pageTextChunks.map((text) => {
      const chunkContent = text.trim();

      const chunk: types.ScrapedChunks = {
        title: pageData.title,
        content: chunkContent,
        links: links !== undefined ? links : '',
        teamMembers: pageData.teamMembers || [],
        topics: pageData.topics || [],
        contentLength: chunkContent.length,
        contentTokens: encode(chunkContent).length,
        embedding: [],
      };

      return chunk;
    });

    if(pageChunks.length > 1) {
      for (let i = 0; i < pageChunks.length; i++) {
        const chunk = pageChunks[i];
        const prevChunk = pageChunks[i - 1];

        if (chunk.contentTokens < 100 && prevChunk) {
          prevChunk.content += " " + chunk.content;
          prevChunk.contentTokens = encode(prevChunk.content).length;
          pageChunks.splice(i, 1);
        }
      }
    };

    const chunkedData: types.ScrapedData[] = [{
      pages: [],
      // teamMembers: [],
      chunks: pageChunks,
      tokens: 0,
    }];

    return chunkedData;
  };


(async () => {
  try {
    const scrapedPages: types.PageData[] = [];

    for (const url of pageUrls) {
      const html = await fetchHTML(mainUrl + url);
      const pageData = parsePageHTML(html, url);

      if (pageData.title.toLowerCase() === 'community') {
        const teamHtml = await fetchHTML(mainUrl + '/Community/');
        const teamMembers = parseTeamHTML(teamHtml);

        pageData.teamMembers = teamMembers;
        console.log('Scraped team members from', mainUrl + '/Community/');
      }

      if (url === '/introduction/topics/') {
        const topicsHtml = await fetchHTML(mainUrl + url);
        const topics = parseTopicsHTML(topicsHtml);

        pageData.topics = topics;
        console.log('Scraped topics from', mainUrl + url);
      }

      scrapedPages.push(pageData);
      console.log(`Scraped ${mainUrl + url}`);
    }

    let totalTokens = 0;

    const data: types.ScrapedData = {
      pages: scrapedPages,
      // teamMembers: [],
      tokens: scrapedPages.reduce((total, page) => total + page.tokens, 0),
    };

    // console.log('Total tokens:', data.tokens);

    const chunkedData: types.ScrapedData[] = [];
    for (let page of data.pages) {
      const pageChunks = await dataChunks(page);
      chunkedData.push(...pageChunks);
    }

    const jsonData = JSON.stringify(chunkedData, null, 2);
    fs.writeFileSync('prealxse.json', jsonData);
    console.log('Data saved to prealxse.json');
  } catch (error) {
    console.error('Error:', error);
  }
})();

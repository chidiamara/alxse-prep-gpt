# ALXSE-Prep-GPT

## Overview

ALXSE-Prep-GPT is an ongoing project aimed at creating a question and answer bot to assist students interested in joining the ALX Software Engineering program. The goal is to develop a robust and efficient system that provides accurate and relevant information about the coding school. The project is currently in progress and is not yet finished.

## Features

- User-friendly interface: The bot offers an intuitive web client interface where users can interact and ask questions about the ALX Software Engineering program.
- AI-powered responses: The bot uses OpenAI's ChatGPT API to generate intelligent and contextually appropriate answers to user queries based on the scraped ALXSE documentation.
- Scraping and data storage: The ALXSE website's documentation is scraped and stored in a Supabase database, enabling efficient retrieval and utilization during the question and answer process.
- Similarity search: The bot performs a similarity search on the scraped documentation to provide the most relevant answers to user questions, enhancing the accuracy of responses.

## Technologies Used

- React: JavaScript library for building user interfaces.
- TypeScript: A statically typed superset of JavaScript.
- Next.js: React framework for server-side rendering and building web applications.
- Tailwind CSS: Utility-first CSS framework for styling the web client.
- Supabase: Open-source alternative to Firebase for backend database storage.
- OpenAI ChatGPT API: AI language model for generating responses to user queries.

## Getting Started

1. Clone the repository: `git clone https://github.com/chidiamara/alxse-prep-gpt.git`
2. Navigate to the project directory: `cd alxse-prep-gpt`
3. Install dependencies: `npm install`
4. Set up your OpenAI API key: Add your API key to the `.env` file in the root directory.
5. Start the development server: `npm run dev`
6. Access the web client: Open your browser and go to `http://localhost:3000`

## Contributing

Contributions to the ALXSE-Prep-GPT project are welcome! As the project is ongoing, you can contribute by adding new features, improving existing functionality, or fixing any issues you come across. Please follow these guidelines for contributing:

1. Fork the repository and create a new branch for your feature or bug fix.
2. Make your changes and ensure that the project builds successfully.
3. Write appropriate tests for your changes, if applicable.
4. Submit a pull request with a detailed description of your changes and their purpose.

## License

This project is licensed under the MIT License. Feel free to use, modify, and distribute the code for personal or commercial purposes.

## Contact

For any inquiries or suggestions regarding the ALXSE-Prep-GPT project, please contact chidiamaraekejiuba@gmail.com. I appreciate your feedback and involvement!

**Note: This project is currently ongoing and is not yet finished. Feedback is welcomed as I continue to develop and improve the bot.**

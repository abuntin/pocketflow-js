# 7 - Tools

Similar to LLM wrappers, the [original authors](https://github.com/miniLLMFlow/PocketFlow) **don't** provide built-in tools. Neither do I, for the same reasons as elaborated [here](./2-llm.md). 

TLDR I think providing a full suite of tools hinders the plurality that comes with TypeScript and NPM, as well as the flexibility of adding tools better suited to your use case / project.

Here, we recommend some *minimal* (and extremely incomplete) implementations of commonly used tools. These examples can serve as a starting point for your own tooling.

---

## 1. Embedding Calls

```javascript
// Ollama 

import ollama from "ollama"

async function getEmbedding(text: string): Promise<number[]> {
    
    const response = await ollama.embed({
        model: 'mxbai-embed-large',
        input: text,
        // other options
    })

    return response.embedding
}

// Example usage
getEmbedding("machine learning")
```

---

## 2. Local-First Database (RxDB)

This is a short example of a tool to create a local-first database using [RxDB](https://rxdb.info/quickstart.html).

Cannot recommend this lib enough, DBs in the BROWSER (including [vector DBs](https://rxdb.info/articles/javascript-vector-database.html)). 

10 points to TypeScript.

```javascript

import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

async function createDB() { 
    return (await createRxDatabase({
        name: 'myDatabase',
        storage: getRxStorageDexie()
    }))
}

async function addCollection(db: RxDatabase, collectionName: string) {
    await myDatabase.addCollections({
        // name of the collection
        todos: {
            // we use the JSON-schema standard
            schema: {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100 // <- the primary key must have maxLength
                    },
                    name: {
                        type: 'string'
                    },
                    done: {
                        type: 'boolean'
                    },
                    timestamp: {
                        type: 'string',
                        format: 'date-time'
                    }
                },
                required: ['id', 'name', 'done', 'timestamp']        
            }
        }
    })
}

async function addDoc(db: RxDatabase, collectionName: string, doc: object) {
    const myDocument = await myDatabase.todos.insert({
        id: 'todo1',
        name: 'Learn RxDB',
        done: false,
        timestamp: new Date().toISOString()
    })
    return myDocument
}

async function runQuery(db: RxDatabase, collectionName: string, query: object) {
    const foundDocuments = await myDatabase.todos.find({
        selector: {
            done: {
                $eq: false
            }
        }
    }).exec()
    return foundDocuments
}

```

---

## 4. JavaScript Function Execution

```javascript
function runCode(code: string) {
    let res: any = eval(code, env)
    return res
}

runCode(eval('2 + 2') === eval(new String('2 + 2'))) // true
```
> ⚠️ Warning (no shxt) eval() is very unsafe and using it in your Nodes should be carefully monitored and absolutely necessary.

---

## 5. PDF Extraction

Using [pdf-parse](https://www.npmjs.com/package/pdf-parse):

```javascript
import pdf from 'pdf-parse'
import fs from 'fs'

async function extractTextFromPDF(pdfPath: string) {
    const data = await pdf(fs.readFileSync(pdfPath))
    return data.text
}
```

---

## 6. Web Crawling

Loving [Firecrawl](https://www.npmjs.com/package/firecrawl) at the moment. 

```javascript
import FirecrawlApp, { CrawlParams, CrawlStatusResponse } from '@mendable/firecrawl-js';
import { z } from 'zod'

const app = new FirecrawlApp({apiKey: "fc-YOUR_API_KEY"});

// Scrape a website

// Define schema to extract contents into
const schema = z.object({
  top: z
    .array(
      z.object({
        title: z.string(),
        points: z.number(),
        by: z.string(),
        commentsURL: z.string(),
      })
    )
    .length(5)
    .describe("Top 5 stories on Hacker News"),
})

async function scrapeUrl(url: string, options?: CrawlParams): Promise<CrawlStatusResponse> {
    const scrapeResponse = await app.scrapeUrl('https://firecrawl.dev', {
        formats: ['markdown', 'html'],
        extractorOptions: { extractionSchema: schema } // for structured response
    })
    return scrapeResponse
}

// Crawl a website

async function crawlUrl(url: string, options?: CrawlParams): Promise<CrawlStatusResponse> {
    const crawlResponse = await app.crawlUrl('https://firecrawl.dev', {
        limit: 100,
        scrapeOptions: {
            formats: ['markdown', 'html'],
        }
    })
    return crawlResponse
}

```

---

## 7. Web Search 

Using [Tavily](https://www.npmjs.com/package/@tavily/core). This was "adapted" from an [ElizaOS plugin](https://github.com/elizaOS/eliza/tree/main/packages/plugin-web-search)

```javascript
import { tavily } from "@tavily/core";

const tavilyClient = tavily({ apiKey: "YOUR_API_KEY" })

type SearchResponse = {
    answer?: string;
    query: string;
    responseTime: number;
    images: SearchImage[];
    results: SearchResult[];
}
interface SearchOptions {
    limit?: number;
    type?: "news" | "general";
    includeAnswer?: boolean;
    searchDepth?: "basic" | "advanced";
    includeImages?: boolean;
    days?: number; // 1 means current day, 2 means last 2 days
}

async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
        try {
            const response = await tavilyClient.search(query, {
                includeAnswer: options?.includeAnswer || true,
                maxResults: options?.limit || 3,
                topic: options?.type || "general",
                searchDepth: options?.searchDepth || "basic",
                includeImages: options?.includeImages || false,
                days: options?.days || 3,
            });

            return response;
        } catch (error) {
            console.error("Web search error:", error);
            throw error;
        }
    }
```

If you have some time on your hands (and / or are cheap like me) you can have a [SearXNG](https://github.com/searxng/searxng) setup running locally. Here is a [guide](https://github.com/Teachings/AIServerSetup/tree/main/03-SearXNG).

```javascript

interface SearchResult {
    url: string,
    title: string,
    content: string,
    publishedDate: Date,
    thumbnail: string,
    engine: string,
    parsed_url: string[],
    template: string,
    engines: string[],
    positions: number[],
    score: number,
    category: string
}

interface SearchResponse {
    query: string,
    number_of_results: number,
    results: SearchResult[]
}

const SEARXNG_URL = "http://localhost:8080" // for example

async function search(query: string): Promise<SearchResponse> {
    const response = await fetch(`${SEARXNG_URL}/search?q=${query}&format=json`)
    const searchResults = await response.json() as SearchResponse
    return searchResults
}

---

You get the idea.
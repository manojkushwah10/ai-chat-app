import { tool } from "ai";
import { z } from "zod";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
const MAX_RESULTS = 5;
const SNIPPET_LENGTH = 300;

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
}

interface TavilySearchResponse {
  results: TavilySearchResult[];
}

export const webSearch = tool({
  description:
    "Search the web for current, real-time, or otherwise unfamiliar information (news, prices, recent releases, specific facts you're not confident about). Do not call this for general knowledge, reasoning, writing, or coding questions you can already answer.",
  inputSchema: z.object({
    query: z.string().describe("A focused search query."),
  }),
  execute: async ({ query }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return { error: "Web search is not configured (missing TAVILY_API_KEY)." };
    }

    const response = await fetch(TAVILY_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        max_results: MAX_RESULTS,
        search_depth: "basic",
      }),
    });

    if (!response.ok) {
      return { error: `Search failed with status ${response.status}.` };
    }

    const data = (await response.json()) as TavilySearchResponse;
    return {
      results: data.results.slice(0, MAX_RESULTS).map((result) => ({
        title: result.title,
        url: result.url,
        snippet: result.content.slice(0, SNIPPET_LENGTH),
      })),
    };
  },
});

export const tools = { webSearch };

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
      return {
        error: "Web search is not configured (missing TAVILY_API_KEY).",
      };
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

// Built per-request with the caller's real IANA time zone (from the
// browser, via `Intl.DateTimeFormat().resolvedOptions().timeZone`) as the
// fallback, so "today"/"this week" resolve to the user's actual location
// instead of UTC when the model omits timeZone.
function createGetCurrentDateTimeTool(defaultTimeZone: string) {
  return tool({
    description:
      "Get the current date and time. Use this whenever you need to know today's date or resolve a relative time reference (e.g. 'today', 'this week', 'how many days until...') — your training data has a cutoff and you cannot know the current date on your own.",
    // Models routinely treat "optional" as "nullable": instead of omitting
    // timeZone they send it as an explicit `null`, and instead of omitting
    // the whole object they send a bare `null` for the arguments. A plain
    // z.object({ timeZone: z.string().optional() }) rejects both of those
    // outright ("expected string, but got null" / "expected object, but got
    // null") — so every level here explicitly allows null, and execute()
    // normalizes it below.
    inputSchema: z
      .object({
        timeZone: z
          .string()
          .nullable()
          .optional()
          .describe(
            "An IANA time zone name, e.g. 'America/New_York' or 'Asia/Kolkata'. Defaults to the user's actual local time zone if omitted or invalid.",
          ),
      })
      .nullable()
      .optional(),
    execute: async (input) => {
      const timeZone = input?.timeZone;
      const now = new Date();
      try {
        const zone = timeZone ?? defaultTimeZone;
        const formatted = new Intl.DateTimeFormat("en-US", {
          dateStyle: "full",
          timeStyle: "long",
          timeZone: zone,
        }).format(now);
        return { iso: now.toISOString(), timeZone: zone, formatted };
      } catch {
        return {
          iso: now.toISOString(),
          timeZone: "UTC",
          formatted: now.toUTCString(),
        };
      }
    },
  });
}

export const getCurrentDateTime = createGetCurrentDateTimeTool("UTC");

export const tools = { webSearch, getCurrentDateTime };

export function createTools(userTimeZone?: string | null) {
  return {
    webSearch,
    getCurrentDateTime: createGetCurrentDateTimeTool(userTimeZone ?? "UTC"),
  };
}

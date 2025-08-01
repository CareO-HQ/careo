import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { content } = await req.json();

  const result = await generateText({
    model: openai.responses("gpt-4o"),
    tools: {
      web_search_preview: openai.tools.webSearchPreview({})
    },
    system:
      "You are a helpful assistant that scrapes the web for information. Return all the properties in the web page. Always return the details for all the properties, do not respond with just some",
    messages: [
      {
        role: "user",
        content
      }
    ]
  });

  console.log(result);

  return NextResponse.json({ content: result });
}

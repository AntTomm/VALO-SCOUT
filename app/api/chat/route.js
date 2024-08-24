import { NextResponse } from "next/server";
import { Pinecone } from '@pinecone-database/pinecone'
import OpenAI from 'openai'
import fetch from 'node-fetch';


const SystemPrompt = `You are VALO-Scout, an expert AI agent specializing in providing valuable insights to VALORANT players. Your primary role is to assist users by answering their queries about the game, offering both detailed information on the top VALORANT players and practical advice for improving gameplay, strictly using the data from the Pinecone database.
When responding, use Markdown to format key information. For example, use ** for bold, * for italic, and [text](url) for hyperlinks.
If a question is asked about one thing, such as streaming, only respond with the players stream time, do not list everything about the player. Also, at most, only


Responsibilities:
Greeting Responses:

If a user greets you with "hello," "hi," or any similar casual greeting, respond in a friendly and welcoming manner. Prompt them to ask a question or offer specific help.
Explaining VALORANT:

If a user asks "What is VALORANT?" or shows uncertainty about what VALORANT is, provide a clear and simple explanation.
Responding to Player Queries:

When a user asks about top players, provide a response that includes details about the top popular players relevant to their query, strictly using the data from the Pinecone database. If specific players are requested and are not in the database, let the user know that the information is not available.
Providing Map Tips:

If a user inquires about strategies or tips for specific maps, offer concise, actionable advice tailored to that map, covering strategies, key positions, and agent usage.
Adapt to User Needs:

Always tailor your responses to the specific needs of the user, whether they are seeking player information, gameplay advice, tips for specific maps, or a friendly chat.
Be Engaging:

Ensure your responses are engaging, informative, and easy to understand. Your goal is to help the user improve their gameplay and enjoy VALORANT to its fullest.
User Query Example:
"Who are the best Jett players right now?"
"What are the best strategies for playing on Ascent?"
Response Examples:
Player Query Example:

"One really good Jett player is [Player Name]. Known for [specific playstyle], [Player Name] is one of the best Jett players in the game, according to the latest data."
Map Query Example:

"On Ascent, controlling mid is crucial. Use a sentinel like Killjoy to lock down key areas with her utility, and smoke off A and B site entrances to limit enemy vision."
This prompt sets the stage for the agent to provide accurate and relevant information from the Pinecone database while still being engaging and informative.

`

export async function POST(req) {
    const data = await req.json();
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const openai = new OpenAI();

    const text = data[data.length - 1].content;

    // Determine the correct namespace based on the content of the query
    const namespace = text.includes("agent") ? "agents" : "ms1";
    const indexName = namespace === "agents" ? 'players' : 'rag';
    
    // Initialize the index with the correct namespace
    const index = pc.index(indexName).namespace(namespace);

    const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
    });

    const results = await index.query({
        topK: 3,
        includeMetadata: true,
        vector: embedding.data[0].embedding,
    });

    let resultString = '\n\nReturned Results from vector DB (done automatically!):';

    // Adjusting the processing part in the POST function based on namespace
    if (namespace === "agents") {
        results.matches.forEach((match) => {
            if (match.metadata && typeof match.metadata.abilities === 'string') {
                // Parse abilities if they are stored as a JSON string
                const abilities = JSON.parse(match.metadata.abilities);
                resultString += `\n
                Agent: ${match.id}
                Abilities:\n${abilities.map(ability => 
                    `- **${ability.name}** (${ability.type}): ${ability.description}\n`).join("")}`;
            } else if (match.metadata && Array.isArray(match.metadata.abilities)) {
                // Directly use the abilities if they are already an array
                resultString += `\n
                Agent: ${match.id}
                Abilities:\n${match.metadata.abilities.map(ability => 
                    `- **${ability.name}** (${ability.type}): ${ability.description}\n`).join("")}`;
            } else {
                console.error(`No metadata or abilities array found for agent ${match.id}`);
            }
        });
    } else {
        results.matches.forEach((match) => {
            console.log("Match ID: ", match.id);  // Log the IDs returned
            if (match.metadata) {
                resultString += `\n
                Player: ${match.id}
                K/D: ${match.metadata.average_kda}
                Most Used Agent: ${match.metadata.most_used_hero}
                Stream Days: ${match.metadata.stream_days}
                Stream Times: ${match.metadata.stream_time}
                Streams Regularly: ${match.metadata.streams_regularly}
                Top Used Weapon: ${match.metadata.top_used_weapon}
                \n\n`;
            } else {
                console.error(`No metadata found for player ${match.id}`);
            }
        });
    }

    console.log(resultString);

    const lastMessage = data[data.length - 1];
    const lastMessageContent = lastMessage.content + resultString;
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

    const completion = await openai.chat.completions.create({
        messages: [
            { role: 'system', content: SystemPrompt },
            ...lastDataWithoutLastMessage,
            { role: 'user', content: lastMessageContent }
        ],
        model: 'gpt-4o-mini',
        stream: true,
    });

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            try {
                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        const text = encoder.encode(content);
                        controller.enqueue(text);
                    }
                }
            } catch (err) {
                controller.error(err);
            } finally {
                controller.close();
            }
        }
    });

    return new NextResponse(stream);
}

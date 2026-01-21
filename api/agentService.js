
import { GoogleGenAI } from "@google/genai";

// Initialize AI Client (Lazy to ensure Env is loaded)
const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * L1: Semantic Router
 * Classifies user intent into Actionable JSON
 */
async function classifyIntent(history, input) {
    console.log("DEBUG ENV: GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "Present, Length: " + process.env.GEMINI_API_KEY.length : "MISSING");
    const systemPrompt = `
You are the Central Dispatcher for an AI Creative Companion.
Your job is to classify the user's latest input into a specific ACTION.

Input Context:
- User Input: The latest message.
- History: Previous conversation (to resolve context like "he", "it").

Available Actions:
1. CHAT: Casual conversation, greetings, compliments, simple logic questions. (FAST)
   - Example: "Hello", "Good job", "Help me rewrite this".
2. SEARCH_KB: Questions about the specific STORY SETTING, CHARACTERS, or WORLD BIBLE.
   - Example: "Who is Ling?", "What happened in the last chapter?", "Describe the magic system".
3. DEEP_RESEARCH: Requests to find EXTERNAL information, historical facts, or research materials.
   - Example: "Find info about 19th century London sewers", "What kinds of guns did pirates use?", "Search for sci-fi tropes".

Output Format (JSON):
{
  "action": "CHAT" | "SEARCH_KB" | "DEEP_RESEARCH",
  "confidence": number, // 0.0 - 1.0
  "payload": {
    "query": string, // Refined search query (for SEARCH_KB or DEEP_RESEARCH)
    "style": string // (Optional) Tone for CHAT
  },
  "reasoning": "Brief explanation"
}

Provide ONLY the JSON output.
`;

    const prompt = `
History: ${history.map(m => `${m.role}: ${m.content}`).slice(-3).join('\n')}
User Input: "${input}"
`;

    try {
        const response = await getAI().models.generateContent({
            model: 'gemini-2.0-flash-exp', // Use Flash for speed
            contents: systemPrompt + prompt,
            config: { responseMimeType: "application/json" }
        });

        return JSON.parse(response.text);
    } catch (error) {
        console.error("Router Error:", error);
        // Fallback safe mode
        return { action: "CHAT", payload: {}, reasoning: "Router Failed" };
    }
}

/**
 * L3: Deep Research Agent
 * Chain of Thought -> Search -> Synthesis
 */
async function deepResearch(query) {
    console.log(`[DeepResearch] Starting for: "${query}"`);

    // Step 1: Planning (Decomposition)
    const planPrompt = `
You are a Deep Research Agent. The user wants: "${query}".
Break this down into 3 specific search queries to gather comprehensive information.
Return JSON: { "queries": ["q1", "q2", "q3"], "focus": "What to look for" }
`;

    let plan = { queries: [query], focus: "General info" };
    try {
        const planRes = await getAI().models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: planPrompt,
            config: { responseMimeType: "application/json" }
        });
        plan = JSON.parse(planRes.text);
    } catch (e) { console.error("Planning failed", e); }

    console.log(`[DeepResearch] Generated Queries:`, plan.queries);

    // Step 2: Execution (Mocking Search for now as we don't have a Search API Key in env)
    // In a real scenario, we would `fetch('google-search-api?q=...')`
    const mockSearchResults = plan.queries.map(q => `
    [Result for "${q}"]
    - Found some relevant info about ${q}.
    - Detail: The ${q} involves complex mechanisms relative to the user's request.
    - Source: example.com/wiki/${q.replace(/\s+/g, '_')}
  `).join('\n');

    // Step 3: Synthesis
    const synthPrompt = `
You are a Research Assistant. Summarize these search results for the user's request: "${query}".
Search Results:
${mockSearchResults}

Focus on: ${plan.focus}
Provide a structured, helpful summary in Chinese.
`;

    const synthRes = await getAI().models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: synthPrompt
    });

    return synthRes.text;
}

/**
 * Direct Chat (Fast Path)
 */
export async function directChat(history) {
    try {
        const res = await getAI().models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: history.map(m => ({ role: m.role, parts: [{ text: m.content }] }))
        });
        return res.text;
    } catch (e) {
        return "I'm having trouble thinking right now.";
    }
}

// Removing module.exports, functions should be exported individually or via export list
// I will prepend export to the function definitions or export at end.
// Since I only replaced the end, I need to make sure function definitions have 'export' or I export them here.
// But 'classifyIntent' and 'deepResearch' were defined as 'async function ...'.
// I cannot easily change the top lines with this Tool call unless I replace the whole file or multiple chunks.
// To be safe and clean, I will use `export { ... }` at the end.

export {
    classifyIntent,
    deepResearch
};

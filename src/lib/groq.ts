type GroqMessage = { role: "system" | "user" | "assistant"; content: string };

type GroqResponse = { choices?: Array<{ message?: { content?: string } }> };

export const groqChat = async (messages: GroqMessage[], temperature = 0.2) => {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY");
  }
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq error: ${response.status} ${errText}`);
  }
  const data = (await response.json()) as GroqResponse;
  return data.choices?.[0]?.message?.content ?? "";
};

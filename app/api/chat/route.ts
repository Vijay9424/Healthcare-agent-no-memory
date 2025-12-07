// app/api/chat/route.ts
import { openai } from "@ai-sdk/openai";
import {
  streamText,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { writeLog, calculateCost } from "@/lib/logger";
import { saveChat } from "@/lib/chat-storage";

export const maxDuration = 30;

type Role = "doctor" | "nurse" | "receptionist";

function getLastUserText(messages: UIMessage[]) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return undefined;
  return lastUser.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join(" ")
    .trim();
}

export async function POST(req: Request) {
  try {
    const {
      messages,
      chatId,
      role,
      patientId,
    }: {
      messages: UIMessage[];
      chatId: string;
      role: Role;
      patientId: string;
    } = await req.json();

  const systemInstruction =
    role === "doctor"
      ? `You are an AI assistant for medical doctors.
Provide only what is asked.
Give factual, medically accurate, concise answers.
If asked for diagnosis, tests, medications, or reasoning — provide them clearly.
Do not add extra explanations, disclaimers, or suggestions unless explicitly requested.
If information is missing, state exactly what is needed.
Never include unnecessary text.`
      : role === "nurse"
      ? `You are an AI assistant for hospital nurses.
Answer only the exact question asked.
Provide concise, practical, clinical nursing information such as medication timing, monitoring steps, wound care, safety alerts, or shift tasks.
Do not add extra explanation or suggestions unless explicitly requested.
If information is incomplete, state what is missing.
No unnecessary details.`
      : `You are an AI assistant for hospital receptionists.
Answer only what is asked.
Provide short, accurate information about appointments, billing, insurance, scheduling, forms, or hospital processes.
Do not give any medical advice.
If the question is medical, redirect by saying: “Please ask a doctor or nurse.”
No extra details or suggestions.`;

    const result = await streamText({
      model: openai("gpt-4o"),
      system: `${systemInstruction}\nCurrent Patient ID (context only): ${patientId}`,
      messages: convertToModelMessages(messages),
      temperature: 0.4, // accuracy over creativity
      async onFinish({ usage, text, finishReason }) {
        const inputTokens = usage?.inputTokens;
        const outputTokens = usage?.outputTokens;

        const cost = calculateCost("GPT4O", inputTokens, outputTokens);

        await writeLog({
          timestamp: new Date().toISOString(),
          model: "gpt-4o",
          finishReason,
          role,
          patientId,
          conversationId: chatId,
          lastUserText: getLastUserText(messages),
          assistantText: text,
          usage: {
            inputTokens,
            outputTokens,
            totalTokens: usage?.totalTokens,
            reasoningTokens: usage?.reasoningTokens,
            cachedInputTokens: usage?.cachedInputTokens,
          },
          costUSD: cost,
        });
      },
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      async onFinish({ messages: updatedMessages }) {
        // ❗ Official pattern: saveChat({ chatId, messages })
        await saveChat({
          chatId,
          messages: updatedMessages,
          role,
          patientId,
        });
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

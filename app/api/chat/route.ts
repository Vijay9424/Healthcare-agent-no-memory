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
    .map((p: any) => p.text)
    .join(" ")
    .trim();
}

export async function POST(req: Request) {
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
      ? `You are an AI assistant that helps medical doctors make professional decisions.
Provide diagnostic insights, differential diagnosis, medication suggestions (with dosage ranges), test recommendations, and red-flag alerts.
Always be factual, concise, and medically accurate.`
      : role === "nurse"
      ? `You are an AI assistant that helps hospital nurses.
Assist in patient monitoring, medication schedules, wound care instructions, discharge planning, and alert nurses to safety concerns.
Provide actionable and clear nursing-oriented guidance.`
      : `You are an AI assistant that helps hospital receptionists.
Assist with scheduling, billing coordination, insurance queries, patient registration, and hospital process guidance.
Never provide medical advice. Always redirect medical questions to a doctor or nurse.`;

  const result = await streamText({
    model: openai("gpt-4o"),
    system: `${systemInstruction}\nCurrent Patient ID (context only): ${patientId}`,
    messages: convertToModelMessages(messages),
    temperature: 0.4, // accuracy over creativity
    async onFinish({ usage, text, finishReason }) {
      const inputTokens =
        usage?.inputTokens ?? usage?.promptTokens;
      const outputTokens =
        usage?.outputTokens ?? usage?.completionTokens;

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
}

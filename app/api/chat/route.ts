// app/api/chat/route.ts
import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, role, patientId } = await req.json();

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
Never provide medical advice. Always redirect medical questions to a doctor or nurse.`

  const result = await streamText({
    model: openai("gpt-4o"),
    system: `${systemInstruction}\nCurrent Patient ID (context only): ${patientId}`,
    messages: convertToModelMessages(messages),
    temperature: 0.4,   // accuracy over creativity
  });

  return result.toUIMessageStreamResponse();
}

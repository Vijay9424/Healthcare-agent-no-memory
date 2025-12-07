// app/api/conversations/route.ts
import { listChats } from "@/lib/chat-storage";

export async function GET() {
  try {
    const conversations = await listChats();
    return Response.json(conversations);
  } catch (error) {
    console.error("Failed to list conversations:", error);
    return Response.json(
      { error: "Failed to list conversations" },
      { status: 500 }
    );
  }
}

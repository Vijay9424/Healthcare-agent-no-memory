// app/api/conversations/[id]/route.ts
import { loadChat } from "@/lib/chat-storage";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return Response.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    const messages = await loadChat(id);
    return Response.json(messages);
  } catch (error) {
    console.error("Failed to load conversation:", error);
    return Response.json(
      { error: "Failed to load conversation" },
      { status: 500 }
    );
  }
}


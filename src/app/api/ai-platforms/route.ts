import { createCollectionHandlers } from "@/lib/resource-api";

const handlers = createCollectionHandlers("ai-platforms");

export const dynamic = "force-dynamic";
export const GET = handlers.GET;
export const POST = handlers.POST;

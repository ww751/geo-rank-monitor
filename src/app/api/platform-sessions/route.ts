import { createCollectionHandlers } from "@/lib/resource-api";

const handlers = createCollectionHandlers("platform-sessions");

export const dynamic = "force-dynamic";
export const GET = handlers.GET;
export const POST = handlers.POST;

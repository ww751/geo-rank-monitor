import { createCollectionHandlers } from "@/lib/resource-api";

const handlers = createCollectionHandlers("rank-results");

export const dynamic = "force-dynamic";
export const GET = handlers.GET;
export const POST = handlers.POST;

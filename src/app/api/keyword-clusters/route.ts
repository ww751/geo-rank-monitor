import { createCollectionHandlers } from "@/lib/resource-api";

const handlers = createCollectionHandlers("keyword-clusters");

export const dynamic = "force-dynamic";
export const GET = handlers.GET;
export const POST = handlers.POST;

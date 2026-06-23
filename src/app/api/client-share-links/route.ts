import { createCollectionHandlers } from "@/lib/resource-api";

const handlers = createCollectionHandlers("client-share-links");

export const dynamic = "force-dynamic";
export const GET = handlers.GET;
export const POST = handlers.POST;

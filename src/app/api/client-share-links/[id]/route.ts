import { createItemHandlers } from "@/lib/resource-api";

const handlers = createItemHandlers("client-share-links");

export const dynamic = "force-dynamic";
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;

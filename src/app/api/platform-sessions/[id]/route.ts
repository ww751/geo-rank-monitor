import { createItemHandlers } from "@/lib/resource-api";

const handlers = createItemHandlers("platform-sessions");

export const dynamic = "force-dynamic";
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;

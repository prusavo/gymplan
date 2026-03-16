import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import { appRouter, type AppRouter } from "./router/index.js";
import { createContext } from "./context.js";

async function main() {
  const server = Fastify({
    logger: true,
    maxParamLength: 5000,
  });

  await server.register(cors, {
    origin: true,
    credentials: true,
  });

  await server.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext,
    } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
  });

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || "0.0.0.0";

  await server.listen({ port, host });
  console.log(`Server listening on http://${host}:${port}`);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

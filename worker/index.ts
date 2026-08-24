import { app } from "./app";
import { dispatchPendingEmails } from "./services/email";

export default {
  async fetch(request, env, context): Promise<Response> {
    return app.fetch(request, env, context);
  },
  async scheduled(_controller, env, context): Promise<void> {
    context.waitUntil(dispatchPendingEmails(env));
  },
} satisfies ExportedHandler<Env>;

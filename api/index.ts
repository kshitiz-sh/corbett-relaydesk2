import { createApiApp } from '../server/app.ts';

const app = createApiApp();

// Keep the request stream untouched so Express can capture the raw body,
// which is required to verify Meta's X-Hub-Signature-256 on WhatsApp webhooks.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default app;

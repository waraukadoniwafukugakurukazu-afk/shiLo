// Cloudflare Workers entrypoint: static shiLo website + authenticated API.
// The API code is shared with Pages Functions for compatibility.
import { onRequest as handleApi } from '../functions/api/[[path]].js';

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/')) {
      return handleApi({ request, env, ctx });
    }
    return env.ASSETS.fetch(request);
  }
};

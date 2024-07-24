export default {
  async fetch(request, env, ctx) {
    return new Response({ success: true });
  },
};

export class Batcher {
  constructor(state, env) {}
}

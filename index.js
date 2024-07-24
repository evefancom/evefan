export default {
  async fetch(request, env, ctx) {
    return new Response({ success: true });
  },
  async queue(batch) {
    console.log('Received queue message');
  }
};

export class Batcher {
  constructor(state, env) {}
}

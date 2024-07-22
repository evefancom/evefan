export default {
  async fetch(request, env, ctx) {
    return new Response("Hello World!");
  },
  async queue(batch) {
    console.log('Received queue message');
  }
};

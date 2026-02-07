export default {
  async fetch() {
    return new Response(
      "Worker deployed. This project is a Next.js app and requires a platform-specific adapter for full functionality.",
      {
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      }
    );
  },
};

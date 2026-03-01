import Pusher from "pusher-js";

let instance: Pusher | null = null;

export const getPusherClient = () => {
  if (instance) return instance;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) {
    return null;
  }
  instance = new Pusher(key, { cluster });
  return instance;
};

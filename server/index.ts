import "dotenv/config";
import { createApp } from "./app";

const port = Number(process.env.PORT) || 4174;
const server = createApp().listen(port, "127.0.0.1", () => {
  console.log("FATE AI server listening on http://127.0.0.1:" + port);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// @ts-check

// --- factory ---
function useRPCWebsocket({ Server, Log, Client }) {
  return {
    client: (Hosts) => {
      let isOpen = false;

      const ws = new Client(Hosts, {
        max_reconnects: 0,
      });

      ws.on("open", () => { isOpen = true; });
      ws.on("close", () => { isOpen = false; });
      ws.on("error", () => { isOpen = false; });

      ws.createCall = (route, data) => {
        if (!isOpen) {
          Log?.error?.("WebSocket connection is not available");
          return null
        }
        return ws.call(route, data);
      };

      return ws;
    },
    server: (Connection) => {
      let wsServer = null;

      const initServer = () => {
        if (!wsServer) {
          wsServer = new Server(Connection);

          wsServer.on("error", (e) => Log?.error?.(e));
          wsServer.on("socket-error", (e) => Log?.error?.(e));
        }
        return wsServer;
      };

      return {
        use: (route, handler) => {
          const server = initServer();
          server.register(route, handler);
        }
      };
    }
  };
}

module.exports = { useRPCWebsocket };

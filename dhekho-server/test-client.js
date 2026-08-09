const WebSocket = require("ws");

const ws = new WebSocket("ws://localhost:3000");

ws.on("open", () => {
    console.log("Connected to Dhekho WebSocket");
});

ws.on("message", (data) => {
    console.log("Received:", JSON.parse(data.toString()));
});

ws.on("close", () => {
    console.log("Disconnected");
});

ws.on("error", (error) => {
    console.error("WebSocket error:", error.message);
});

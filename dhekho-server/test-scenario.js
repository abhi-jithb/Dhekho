const WebSocket = require("ws");

const SERVER_HTTP = "http://localhost:3000/activity";
const SERVER_WS = "ws://localhost:3000";

async function sendActivity(activity) {
    const response = await fetch(SERVER_HTTP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activity)
    });
    return response.json();
}

function createClient(developerId, developerName, workspaceId, onMessage) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(SERVER_WS);
        ws.on("open", () => {
            ws.send(JSON.stringify({
                type: "register",
                developerId,
                developerName,
                workspaceId
            }));
            resolve(ws);
        });
        ws.on("message", (data) => {
            const parsed = JSON.parse(data.toString());
            onMessage(parsed);
        });
        ws.on("error", reject);
    });
}

function delay(ms) {
    return new Promise((res) => setTimeout(res, ms));
}

async function runTest() {
    console.log("=== Starting Dhekho E2E Test Scenario ===");

    const aliceEvents = [];
    const bobEvents = [];

    // 1. Connect Client A (Alice) and Client B (Bob)
    console.log("1. Connecting Alice and Bob WS clients...");
    const clientAlice = await createClient("alice", "Alice", "Dhekho", (msg) => {
        console.log("[ALICE RECEIVED]:", msg.type, JSON.stringify(msg.payload || {}));
        aliceEvents.push(msg);
    });

    const clientBob = await createClient("bob", "Bob", "Dhekho", (msg) => {
        console.log("[BOB RECEIVED]:", msg.type, JSON.stringify(msg.payload || {}));
        bobEvents.push(msg);
    });

    await delay(500);

    // 2. Alice switches to src/auth/login.ts
    console.log("\n2. Alice switches active file to 'src/auth/login.ts'");
    await sendActivity({
        type: "active-file-changed",
        file: "src/auth/login.ts",
        workspaceId: "Dhekho",
        timeStamp: new Date().toISOString(),
        developerId: "alice",
        developerName: "Alice"
    });

    await delay(500);

    // 3. Bob switches to src/components/Navbar.tsx
    console.log("\n3. Bob switches active file to 'src/components/Navbar.tsx'");
    await sendActivity({
        type: "active-file-changed",
        file: "src/components/Navbar.tsx",
        workspaceId: "Dhekho",
        timeStamp: new Date().toISOString(),
        developerId: "bob",
        developerName: "Bob"
    });

    await delay(500);

    // 4. Alice moves from login.ts to register.ts
    console.log("\n4. Alice switches active file to 'src/auth/register.ts'");
    await sendActivity({
        type: "active-file-changed",
        file: "src/auth/register.ts",
        workspaceId: "Dhekho",
        timeStamp: new Date().toISOString(),
        developerId: "alice",
        developerName: "Alice"
    });

    await delay(500);

    // 5. Bob disconnects
    console.log("\n5. Bob disconnects WebSocket...");
    clientBob.close();

    await delay(500);

    // Check presence API
    console.log("\n6. Checking /presence endpoint for workspace Dhekho...");
    const presenceRes = await fetch("http://localhost:3000/presence?workspaceId=Dhekho");
    const activePresence = await presenceRes.json();
    console.log("Current Active Presence on Server:", activePresence);

    clientAlice.close();
    console.log("\n=== Test Scenario Completed Successfully ===");
    process.exit(0);
}

runTest().catch((err) => {
    console.error("Test Scenario Failed:", err);
    process.exit(1);
});

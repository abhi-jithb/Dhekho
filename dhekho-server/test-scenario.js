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
    console.log("=== Starting Comprehensive Dhekho E2E Test Suite ===");

    const dev1Events = [];
    const dev2Events = [];
    const projBEvents = [];

    // Step 1: Connect Developer 1 (Abhijith) and Developer 2 (Rahul) to Workspace "ProjectA"
    console.log("\n[Test 1 & 2] Connecting Developer 1 (Abhijith) and Developer 2 (Rahul)...");
    const clientDev1 = await createClient("abhijith", "Abhijith B", "ProjectA", (msg) => {
        console.log("  [Abhijith WS Received]:", msg.type, msg.payload?.developerId || "");
        dev1Events.push(msg);
    });

    const clientDev2 = await createClient("rahul", "Rahul S", "ProjectA", (msg) => {
        console.log("  [Rahul WS Received]:", msg.type, msg.payload?.developerId || "");
        dev2Events.push(msg);
    });

    // Step 2: Connect Isolated Client to Workspace "ProjectB"
    console.log("\n[Test 5] Connecting Client to Workspace 'ProjectB' for isolation testing...");
    const clientProjB = await createClient("dev3", "Dev 3", "ProjectB", (msg) => {
        projBEvents.push(msg);
    });

    await delay(300);

    // Step 3: Abhijith switches active file to src/auth/login.ts
    console.log("\n[Test 3] Abhijith switches file to 'src/auth/login.ts'");
    await sendActivity({
        type: "active-file-changed",
        file: "src/auth/login.ts",
        workspaceId: "ProjectA",
        timeStamp: new Date().toISOString(),
        developerId: "abhijith",
        developerName: "Abhijith B",
        gitBranch: "main"
    });

    await delay(300);

    // Step 4: Rahul switches active file to src/components/Navbar.tsx
    console.log("\n[Test 4] Rahul switches file to 'src/components/Navbar.tsx'");
    await sendActivity({
        type: "active-file-changed",
        file: "src/components/Navbar.tsx",
        workspaceId: "ProjectA",
        timeStamp: new Date().toISOString(),
        developerId: "rahul",
        developerName: "Rahul S",
        gitBranch: "feature/nav"
    });

    await delay(300);

    // Step 5: Abhijith moves from login.ts to register.ts
    console.log("\n[Test 3 Move] Abhijith moves file from 'src/auth/login.ts' to 'src/auth/register.ts'");
    await sendActivity({
        type: "active-file-changed",
        file: "src/auth/register.ts",
        workspaceId: "ProjectA",
        timeStamp: new Date().toISOString(),
        developerId: "abhijith",
        developerName: "Abhijith B",
        gitBranch: "main"
    });

    await delay(300);

    // Step 6: Disconnect Rahul
    console.log("\n[Test 6] Disconnecting Rahul WS client...");
    clientDev2.close();

    await delay(300);

    // Step 7: Verify Presence API & Workspace Isolation
    console.log("\n[Test 7] Verifying Server /presence for Workspace 'ProjectA'...");
    const presResA = await fetch("http://localhost:3000/presence?workspaceId=ProjectA");
    const activeA = await presResA.json();
    console.log("  Active Presence in ProjectA:", activeA);

    if (activeA.length === 1 && activeA[0].developerId === "abhijith" && activeA[0].activeFile === "src/auth/register.ts") {
        console.log("  ✔ SUCCESS: ProjectA presence accurately shows only Abhijith on register.ts!");
    } else {
        throw new Error("FAILED: ProjectA presence verification failed.");
    }

    // Verify ProjectB isolation (ProjectB should have zero events from ProjectA)
    const projectAEventsOnB = projBEvents.filter(e => e.type === "presence_update" && e.payload?.workspaceId === "ProjectA");
    if (projectAEventsOnB.length === 0) {
        console.log("  ✔ SUCCESS: Workspace isolation verified! ProjectB received 0 events from ProjectA.");
    } else {
        throw new Error("FAILED: Workspace isolation leaked events to ProjectB.");
    }

    clientDev1.close();
    clientProjB.close();

    console.log("\n=== ALL 7 E2E TESTS PASSED SUCCESSFULLY ===");
    process.exit(0);
}

runTest().catch((err) => {
    console.error("E2E Test Suite Failed:", err);
    process.exit(1);
});

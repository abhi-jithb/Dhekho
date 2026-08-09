const express = require("express");
const { WebSocketServer, WebSocket } = require("ws");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/dashboard.html");
});

const activities = [];

// workspaceId -> Map<developerId, TeammateState>
const workspacePresenceMap = new Map();

function getWorkspaceMap(workspaceId) {
    const wId = workspaceId || "default";
    if (!workspacePresenceMap.has(wId)) {
        workspacePresenceMap.set(wId, new Map());
    }
    return workspacePresenceMap.get(wId);
}

function broadcastToWorkspace(workspaceId, messageObj) {
    const jsonStr = JSON.stringify(messageObj);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.workspaceId === workspaceId) {
            client.send(jsonStr);
        }
    });
}

// HTTP server
const server = app.listen(3000, () => {
    console.log("Dhekho server running on port 3000");
});

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.send(JSON.stringify({
        type: "connected",
        message: "Connected to Dhekho server"
    }));

    ws.on("message", (rawMessage) => {
        try {
            const data = JSON.parse(rawMessage.toString());
            if (data.type === "register") {
                const { developerId, developerName, workspaceId } = data;
                ws.developerId = developerId;
                ws.developerName = developerName || developerId;
                ws.workspaceId = workspaceId || "default";

                console.log(`Registered WS client: ${developerId} in workspace: ${ws.workspaceId}`);

                // Send snapshot of current active presence for this workspace
                const wMap = getWorkspaceMap(ws.workspaceId);
                const snapshot = Array.from(wMap.values());

                ws.send(JSON.stringify({
                    type: "presence_snapshot",
                    payload: snapshot
                }));
            }
        } catch (err) {
            console.error("Error parsing WS message:", err);
        }
    });

    ws.on("close", () => {
        const { developerId, workspaceId } = ws;
        console.log(`Client disconnected: ${developerId || 'unknown'}`);

        if (developerId && workspaceId) {
            // Check if developer has other active socket connections
            let hasOtherSocket = false;
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN && client.developerId === developerId && client.workspaceId === workspaceId) {
                    hasOtherSocket = true;
                }
            });

            if (!hasOtherSocket) {
                const wMap = getWorkspaceMap(workspaceId);
                wMap.delete(developerId);

                broadcastToWorkspace(workspaceId, {
                    type: "developer_offline",
                    payload: {
                        developerId,
                        workspaceId
                    }
                });
                console.log(`Developer ${developerId} marked offline in workspace ${workspaceId}`);
            }
        }
    });
});

// Receive activity
app.post("/activity", (req, res) => {
    const activity = req.body;
    const workspaceId = activity.workspaceId || "default";

    console.log("Activity received:", activity);
    activities.push(activity);

    const wMap = getWorkspaceMap(workspaceId);
    const existing = wMap.get(activity.developerId);

    const startTime = (existing && existing.activeFile === activity.file && existing.startTime)
        ? existing.startTime
        : (activity.timeStamp || new Date().toISOString());

    const teammateState = {
        developerId: activity.developerId,
        developerName: activity.developerName || activity.developerId,
        workspaceId,
        activeFile: activity.file,
        gitBranch: activity.gitBranch || existing?.gitBranch,
        startTime,
        isEditing: typeof activity.isEditing === "boolean" ? activity.isEditing : existing?.isEditing || false,
        lastSaved: activity.lastSaved || existing?.lastSaved,
        lastSeen: activity.timeStamp || new Date().toISOString()
    };

    wMap.set(activity.developerId, teammateState);

    // Broadcast presence update to workspace clients
    broadcastToWorkspace(workspaceId, {
        type: "presence_update",
        payload: teammateState
    });

    // Also broadcast raw activity for legacy/dashboard support
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(activity));
        }
    });

    res.json({
        success: true
    });
});

// Get previous activities
app.get("/activities", (req, res) => {
    res.json(activities);
});

// Get active teammate presence per workspace
app.get("/presence", (req, res) => {
    const workspaceId = req.query.workspaceId || "default";
    const wMap = getWorkspaceMap(workspaceId);
    res.json(Array.from(wMap.values()));
});

// Clear teammate presence explicitly
app.delete("/presence", (req, res) => {
    const workspaceId = req.query.workspaceId || "default";
    const developerId = req.query.developerId;
    if (!developerId) {
        return res.status(400).json({ error: "developerId is required" });
    }

    const wMap = getWorkspaceMap(workspaceId);
    const existed = wMap.delete(developerId);

    if (existed) {
        broadcastToWorkspace(workspaceId, {
            type: "developer_offline",
            payload: { developerId, workspaceId }
        });
    }

    res.json({ success: true, removed: existed });
});

// Paginated activity history endpoint
app.get("/activities/history", (req, res) => {
    const workspaceId = req.query.workspaceId;
    const limit = parseInt(req.query.limit, 10) || 50;

    let filtered = activities;
    if (workspaceId) {
        filtered = activities.filter(a => (a.workspaceId || "default") === workspaceId);
    }

    const result = filtered.slice(-limit).reverse();
    res.json(result);
});

// Periodic background check to prune stale inactive sessions (> 15 mins)
const STALE_TIMEOUT_MS = 15 * 60 * 1000;
setInterval(() => {
    const now = Date.now();
    workspacePresenceMap.forEach((wMap, workspaceId) => {
        wMap.forEach((state, developerId) => {
            const lastSeenTime = new Date(state.lastSeen).getTime();
            if (now - lastSeenTime > STALE_TIMEOUT_MS) {
                console.log(`Pruning stale inactive session for developer ${developerId} in workspace ${workspaceId}`);
                wMap.delete(developerId);
                broadcastToWorkspace(workspaceId, {
                    type: "developer_offline",
                    payload: { developerId, workspaceId }
                });
            }
        });
    });
}, 30000);
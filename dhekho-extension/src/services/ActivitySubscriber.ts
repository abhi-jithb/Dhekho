import { PresenceManager } from "./PresenceManager";

export class ActivitySubscriber {
    private ws: WebSocket | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private isDisposed = false;

    constructor(
        private readonly serverUrl: string,
        private readonly developerId: string,
        private readonly developerName: string,
        private readonly workspaceId: string,
        private readonly presenceManager: PresenceManager
    ) {}

    public connect(): void {
        if (this.isDisposed) {
            return;
        }

        try {
            console.log(`Connecting Dhekho WebSocket to ${this.serverUrl}...`);
            this.ws = new WebSocket(this.serverUrl);

            this.ws.onopen = () => {
                console.log("Dhekho WebSocket connected successfully.");
                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = null;
                }

                // Register identity and workspace
                const registerPayload = {
                    type: "register",
                    developerId: this.developerId,
                    developerName: this.developerName,
                    workspaceId: this.workspaceId
                };
                this.ws?.send(JSON.stringify(registerPayload));
            };

            this.ws.onmessage = (event: MessageEvent) => {
                try {
                    const data = JSON.parse(event.data.toString());
                    this.handleMessage(data);
                } catch (err) {
                    console.error("Error processing Dhekho WS message:", err);
                }
            };

            this.ws.onerror = (err) => {
                console.error("Dhekho WebSocket error:", err);
            };

            this.ws.onclose = () => {
                console.log("Dhekho WebSocket closed.");
                this.scheduleReconnect();
            };
        } catch (err) {
            console.error("Error initiating Dhekho WebSocket connection:", err);
            this.scheduleReconnect();
        }
    }

    private handleMessage(data: any): void {
        if (!data || !data.type) {
            return;
        }

        switch (data.type) {
            case "presence_snapshot":
                if (Array.isArray(data.payload)) {
                    this.presenceManager.setSnapshot(data.payload, this.developerId);
                }
                break;
            case "presence_update":
                if (data.payload) {
                    this.presenceManager.updatePresence(data.payload, this.developerId);
                }
                break;
            case "developer_offline":
                if (data.payload && data.payload.developerId) {
                    this.presenceManager.removeDeveloper(data.payload.developerId);
                }
                break;
            default:
                break;
        }
    }

    private scheduleReconnect(): void {
        if (this.isDisposed || this.reconnectTimer) {
            return;
        }

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            console.log("Attempting Dhekho WebSocket reconnect...");
            this.connect();
        }, 3000);
    }

    public dispose(): void {
        this.isDisposed = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

import type { RegisterClientMessage } from "./types";
import { getSettings } from "./globalSettings.svelte";

class WebSocketClient
{
	private static instance: WebSocketClient | null;
	private webSocket: WebSocket | null = null;

	public static getInstance()
	{
		if (this.instance != null) return this.instance;
		WebSocketClient.instance = new WebSocketClient();
		return WebSocketClient.instance;
	}

	public connect(ipAddress: string)
	{
		this.disconnect();
		this.webSocket = new WebSocket(ipAddress);
		this.webSocket.onopen = () =>
		{
			console.log(`socket open`);
			if (this.webSocket)
			{
				this.sendRegisterClientMessage(this.webSocket);
			}
		};
		this.webSocket.onmessage = (event) =>
		{
			if (typeof event.data == `string`)
			{
				console.log(`Received message: ` + event.data);
			}
		};
		this.webSocket.onclose = () =>
		{
			console.log(`socket close`);
		};
		this.webSocket.onerror = () =>
		{
			console.log(`socket error`);
		};
	}

	public disconnect()
	{
		this.webSocket?.close();
	}

	public sendRegisterClientMessage(webSocket: WebSocket)
	{
		const registerClientMessage: RegisterClientMessage = {
			message_type: `registerClient`,
			correlation_id: crypto.randomUUID(),
			payload: {
				name: getSettings().userName,
			},
		};

		webSocket.send(JSON.stringify(registerClientMessage));
	}
}

export default WebSocketClient;

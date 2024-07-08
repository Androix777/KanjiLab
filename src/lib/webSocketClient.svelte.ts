import type { BaseMessage, ClientListMessage, GetClientListMessage, RegisterClientMessage, StatusMessage } from "./types";
import { getSettings } from "./globalSettings.svelte";

class WebSocketClient
{
	private static instance: WebSocketClient | null;
	private webSocket: WebSocket | null = null;
	private messagePool: Map<string, (message: BaseMessage<object, string>) => void> = new Map();
	public clientList: Array<{ name: string }> = $state([]);

	public connectionStatus: `Disconnected` | `Connecting` | `Connected` = $state(`Disconnected`);

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
		this.webSocket.onopen = async () =>
		{
			console.log(`socket open`);
			this.connectionStatus = `Connected`;
			try
			{
				if (await this.sendRegisterClientMessage())
				{
					this.sendGetClientListMessage();
				}
				else
				{
					console.log(`Registration: failed`);
				}
			}
			catch
			{
				console.log(`Registration: no response`);
			}
		};
		this.webSocket.onmessage = (event) =>
		{
			if (typeof event.data == `string`)
			{
				const message: BaseMessage<object, string> = <BaseMessage<object, string>>JSON.parse(event.data);
				console.log(`Received message: ` + event.data);
				if (!message.correlation_id) return;

				const callback = this.messagePool.get(message.correlation_id);
				if (callback)
				{
					callback(message);
					this.messagePool.delete(message.correlation_id);
				}
			}
		};
		this.webSocket.onclose = () =>
		{
			console.log(`socket close`);
			this.disconnect();
		};
		this.webSocket.onerror = () =>
		{
			console.log(`socket error`);
		};
		this.connectionStatus = `Connecting`;
	}

	public disconnect()
	{
		this.webSocket?.close();
		this.clientList = [];
		this.connectionStatus = `Disconnected`;
	}

	public async sendRegisterClientMessage()
	{
		if (!this.webSocket) return;
		const correlation_id = crypto.randomUUID();
		const registerClientMessage: RegisterClientMessage = {
			message_type: `registerClient`,
			correlation_id: correlation_id,
			payload: {
				name: getSettings().userName,
			},
		};

		let resolvePromise: (resolve: boolean) => void;
		let rejectPromise: (reject: boolean) => void;
		const registered: Promise<boolean> = new Promise((resolve, reject) =>
		{
			resolvePromise = resolve;
			rejectPromise = reject;
		});
		this.messagePool.set(correlation_id, (message) =>
		{
			const statusMessage = <StatusMessage>message;

			if (statusMessage.payload.status == `success`)
			{
				resolvePromise(true);
			}
			else
			{
				resolvePromise(false);
			}
		});
		setTimeout(() =>
		{
			rejectPromise(false);
		}, 5000);
		this.webSocket.send(JSON.stringify(registerClientMessage));
		const result = await registered;
		return result;
	}

	public sendGetClientListMessage()
	{
		if (!this.webSocket) return;
		const correlation_id = crypto.randomUUID();
		const getClientListMessage: GetClientListMessage = {
			message_type: `getClientList`,
			correlation_id: correlation_id,
			payload: {},
		};

		this.messagePool.set(correlation_id, (message) =>
		{
			const clientListMessage = <ClientListMessage>message;

			this.clientList = clientListMessage.payload.clients;
		});

		this.webSocket.send(JSON.stringify(getClientListMessage));
	}
}

export default WebSocketClient;

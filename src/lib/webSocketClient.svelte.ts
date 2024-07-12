import type { BaseMessage, ClientListMessage, GetClientListMessage, RegisterClientMessage, StatusMessage } from "./types";
import { getSettings } from "./globalSettings.svelte";

class WebSocketClient
{
	private static instance: WebSocketClient | null;
	private serverConnector: ServerConnector | null = null;
	public clientList: Array<{ name: string }> = $state([]);

	public connectionStatus: `Disconnected` | `Connecting` | `Connected` = $state(`Disconnected`);
	private updateInterval: number | null = null;

	public static getInstance()
	{
		if (this.instance != null) return this.instance;
		WebSocketClient.instance = new WebSocketClient();
		return WebSocketClient.instance;
	}

	public async connectToServer(ipAddress: string)
	{
		this.connectionStatus = `Connecting`;
		this.serverConnector = new ServerConnector();
		await this.serverConnector.connect(ipAddress);

		this.connectionStatus = `Connected`;
		this.serverConnector.addEventListener(`socketClosed`, () =>
		{
			this.disconnectFromServer();
		});

		await this.updateClientList();

		this.updateInterval = setInterval(() =>
		{
			void this.updateClientList();
		}, 2000);
	}

	public disconnectFromServer()
	{
		this.serverConnector?.disconnect();
		this.connectionStatus = `Disconnected`;
		this.clientList = [];
		if (this.updateInterval)
		{
			clearInterval(this.updateInterval);
		}
	}

	public async updateClientList()
	{
		if (!this.serverConnector) return;

		const newClientList = await this.serverConnector.getClientList();
		if (newClientList)
		{
			this.clientList = newClientList;
		}
		else
		{
			console.log(`Failed to get clientList`);
		}
	}
}

class ServerConnector extends EventTarget
{
	private webSocket: WebSocket | null = null;
	private messagePool: Map<string, (message: BaseMessage<object, string>) => void> = new Map();

	public async connect(ipAddress: string)
	{
		this.disconnect();
		this.webSocket = new WebSocket(ipAddress);
		this.webSocket.onopen = async () =>
		{
			console.log(`socket open`);
			await this.register();
			resolvePromise(true);
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
			this.dispatchEvent(new Event(`socketClosed`));
			this.disconnect();
		};
		this.webSocket.onerror = () =>
		{
			console.log(`socket error`);
		};

		let resolvePromise: (result: boolean) => void;
		let rejectPromise: () => void;
		const resultPromise: Promise<boolean> = new Promise((resolve, reject) =>
		{
			resolvePromise = resolve;
			rejectPromise = reject;
		});

		setTimeout(() =>
		{
			rejectPromise();
		}, 5000);

		return await resultPromise;
	}

	public disconnect()
	{
		this.webSocket?.close();
	}

	public async register()
	{
		try
		{
			if (await this.sendRegisterClientMessage())
			{
				console.log(`Registration: complete`);
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
	}

	public async getClientList()
	{
		try
		{
			return await this.sendGetClientListMessage();
		}
		catch
		{
			return false;
		}
	}

	public async sendRegisterClientMessage()
	{
		if (!this.webSocket) return false;
		const correlation_id = crypto.randomUUID();
		const registerClientMessage: RegisterClientMessage = {
			message_type: `registerClient`,
			correlation_id: correlation_id,
			payload: {
				name: getSettings().userName,
			},
		};

		let resolvePromise: (result: boolean) => void;
		let rejectPromise: () => void;
		const resultPromise: Promise<boolean> = new Promise((resolve, reject) =>
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
			rejectPromise();
		}, 5000);

		this.webSocket.send(JSON.stringify(registerClientMessage));
		const result = await resultPromise;
		return result;
	}

	public async sendGetClientListMessage()
	{
		if (!this.webSocket) return false;
		const correlation_id = crypto.randomUUID();
		const getClientListMessage: GetClientListMessage = {
			message_type: `getClientList`,
			correlation_id: correlation_id,
			payload: {},
		};

		let resolvePromise: (clientList: Array<{ name: string }>) => void;
		let rejectPromise: () => void;
		const resultPromise: Promise<Array<{ name: string }>> = new Promise((resolve, reject) =>
		{
			resolvePromise = resolve;
			rejectPromise = reject;
		});

		this.messagePool.set(correlation_id, (message) =>
		{
			const clientListMessage = <ClientListMessage>message;
			resolvePromise(clientListMessage.payload.clients);
		});

		setTimeout(() =>
		{
			rejectPromise();
		}, 5000);

		this.webSocket.send(JSON.stringify(getClientListMessage));
		const result = await resultPromise;
		return result;
	}
}

export default WebSocketClient;

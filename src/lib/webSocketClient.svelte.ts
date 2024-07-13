import { ServerConnector } from "$lib/webSocketConnector";
import type { ChatSentPayload, ClientDisconnectedPayload, ClientRegisteredPayload } from "./types";

class WebSocketClient
{
	private static instance: WebSocketClient | null;
	private serverConnector: ServerConnector | null = null;
	public clientList: Array<{ id: string; name: string }> = $state([]);
	public chatList: Array<{ id: string; message: string }> = $state([]);

	public connectionStatus: `Disconnected` | `Connecting` | `Connected` = $state(`Disconnected`);

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
		try
		{
			await this.serverConnector.connect(ipAddress);
		}
		catch
		{
			this.disconnectFromServer();
			return;
		}

		this.connectionStatus = `Connected`;

		this.serverConnector.addEventListener(`socketClosed`, () =>
		{
			this.disconnectFromServer();
		});
		this.serverConnector.addEventListener(`clientRegistered`, (event) =>
		{
			const customEvent: CustomEvent<ClientRegisteredPayload> = <CustomEvent<ClientRegisteredPayload>>event;
			this.clientList.push({ id: customEvent.detail.id, name: customEvent.detail.name });
		});
		this.serverConnector.addEventListener(`clientDisconnected`, (event) =>
		{
			const customEvent: CustomEvent<ClientDisconnectedPayload> = <CustomEvent<ClientDisconnectedPayload>>event;
			this.clientList = this.clientList.filter(client => client.id != customEvent.detail.id);
		});
		this.serverConnector.addEventListener(`chatSent`, (event) =>
		{
			const customEvent: CustomEvent<ChatSentPayload> = <CustomEvent<ChatSentPayload>>event;
			this.chatList.push({ id: customEvent.detail.id, message: customEvent.detail.message });
		});

		await this.updateClientList();
	}

	public disconnectFromServer()
	{
		this.serverConnector?.disconnect();
		this.connectionStatus = `Disconnected`;
		this.clientList = [];
		this.chatList = [];
	}

	public async updateClientList()
	{
		if (!this.serverConnector) return;

		const newClientList = await this.getClientList();
		if (newClientList)
		{
			this.clientList = newClientList;
		}
		else
		{
			console.log(`Failed to get clientList`);
		}
	}

	public async register()
	{
		if (!this.serverConnector) return;
		try
		{
			if (await this.serverConnector.sendRegisterClientMessage())
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
		if (!this.serverConnector) return;
		try
		{
			return await this.serverConnector.sendGetClientListMessage();
		}
		catch
		{
			return false;
		}
	}

	public sendChatMessage(message: string)
	{
		this.serverConnector?.sendChatMessage(message);
	}

	public getClient(id: string)
	{
		return this.clientList.filter(client => client.id == id)[0];
	}
}

export default WebSocketClient;

use crate::server_logic::{
    add_client, client_exists, get_admin_password, get_client, get_client_list, initialize, make_admin, remove_client, Client
};
use crate::structures::{
    AdminMadePayload, BaseMessage, ChatSentPayload, ClientDisconnectedPayload, ClientInfo, ClientListPayload, ClientRegisteredPayload, MakeAdminPayload, RegisterClientPayload, SendChatPayload, StatusPayload
};
use colored::*;
use futures_util::stream::SplitSink;
use futures_util::{SinkExt, StreamExt};
use serde::de::DeserializeOwned;
use serde_json::{self, Value};
use std::collections::HashMap;
use std::sync::{Arc, OnceLock};
use tokio::net::{TcpListener, TcpStream};
use tokio::runtime::Runtime;
use tokio::sync::{oneshot, Mutex};
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{accept_async, WebSocketStream};
use uuid::Uuid;

static mut SERVER_HANDLE: Option<oneshot::Sender<()>> = None;

pub type ClientWrite = Arc<Mutex<SplitSink<WebSocketStream<TcpStream>, Message>>>;
pub type ClientsConnections = Arc<Mutex<HashMap<String, ClientWrite>>>;

fn clients_connections() -> &'static ClientsConnections {
    static CLIENTS_CONNECTIONS: OnceLock<ClientsConnections> = OnceLock::new();
    CLIENTS_CONNECTIONS.get_or_init(|| Arc::new(Mutex::new(HashMap::new())))
}

pub async fn call_launch_server() {
    let rt = Runtime::new().unwrap();
    let (stop_tx, stop_rx) = oneshot::channel();
    let (start_tx, start_rx) = oneshot::channel();
    unsafe {
        SERVER_HANDLE = Some(stop_tx);
    }

    std::thread::spawn(move || {
        rt.block_on(async {
            launch_server(stop_rx, start_tx).await;
        });
    });

    start_rx.await.expect("Failed to receive start signal");
}

pub fn call_stop_server() {
    unsafe {
        if let Some(tx) = SERVER_HANDLE.take() {
            let _ = tx.send(());
        }
    }
}

async fn disconnect_all_clients() {
    let connections = clients_connections();
    let mut connections_lock = connections.lock().await;

    for (client_id, client_write) in connections_lock.drain() {
        let mut write = client_write.lock().await;
        if let Err(e) = write.send(Message::Close(None)).await {
            eprintln!("Error sending close message to {}: {}", client_id, e);
        }
    }
}

pub async fn launch_server(stop_signal: oneshot::Receiver<()>, start_signal: oneshot::Sender<()>) {
    initialize();
    let listener = TcpListener::bind("0.0.0.0:8080")
        .await
        .expect("Failed to bind");
    println!("WebSocket server listening on ws://0.0.0.0:8080");

    start_signal.send(()).unwrap();

    tokio::select! {
        _ = async {
            while let Ok((stream, _)) = listener.accept().await {
                tokio::spawn(handle_connection(stream));
            }
        } => {},
        _ = stop_signal => {
            println!("Received stop signal. Shutting down server.");
            disconnect_all_clients().await;
        },
    }
}

async fn handle_connection(stream: tokio::net::TcpStream) {
    let ws_stream = accept_async(stream).await.expect("Failed to accept");
    let peer_addr = ws_stream.get_ref().peer_addr().unwrap();
    log("???", "connected", &peer_addr.to_string());

    let (write, mut read) = ws_stream.split();
    let client_id = Uuid::new_v4().to_string();
    clients_connections()
        .lock()
        .await
        .insert(client_id.clone(), Arc::new(Mutex::new(write)));

    while let Some(message) = read.next().await {
        let message = match message {
            Ok(msg) => msg,
            Err(_) => {
                send_status(&client_id, &String::new(), "receivingMessageError").await;
                continue;
            }
        };

        let message_str = match message.to_text() {
            Ok(text) => text,
            Err(_) => {
                send_status(&client_id, &String::new(), "invalidTextError").await;
                continue;
            }
        };

        let incoming_message = match serde_json::from_str::<BaseMessage>(message_str) {
            Ok(msg) => msg,
            Err(_) => {
                send_status(&client_id, &String::new(), "invalidJSONError").await;
                continue;
            }
        };

        if let Some(client) = get_client(&client_id) {
            log(
                &client.name,
                &incoming_message.message_type,
                &peer_addr.to_string(),
            );
        } else {
            log(
                "???",
                &incoming_message.message_type,
                &peer_addr.to_string(),
            );
        }

        match incoming_message.message_type.as_str() {
            "registerClient" => handle_register_client(&client_id, incoming_message).await,
            "getClientList" => handle_get_client_list(&client_id, incoming_message).await,
            "sendChat" => handle_send_chat(&client_id, incoming_message).await,
			"makeAdmin" => handle_make_admin(&client_id, incoming_message).await,
            _ => handle_unknown_message(&client_id, incoming_message).await,
        };
    }

    let deleted_client: Option<Client>;
    if let Some(client) = get_client(&client_id) {
        log(&client.name, "disconnected", &peer_addr.to_string());
        deleted_client = Some(client);
    } else {
        log("???", "disconnected", &peer_addr.to_string());
        deleted_client = None;
    }

    remove_client(&client_id);
    clients_connections().lock().await.remove(&client_id);

    if let Some(client) = deleted_client {
        let event_payload = ClientDisconnectedPayload {
            id: client_id.to_string(),
            name: client.name.clone(),
        };

		let event = BaseMessage::new(event_payload, None);

        let response_json = serde_json::to_string(&event).unwrap();
        let _ = send_all(&response_json).await;
    }
}

async fn handle_register_client(client_id: &str, incoming_message: BaseMessage) {
    if let Ok(payload) = validate_payload::<RegisterClientPayload>(
        client_id,
        &incoming_message.correlation_id,
        incoming_message.payload,
    )
    .await
    {
        let is_added = add_client(client_id, &payload.name);

        if !is_added {
            send_status(
                client_id,
                &incoming_message.correlation_id,
                "alreadyRegisteredError",
            )
            .await;
            return;
        }

        let _ = send_status(client_id, &incoming_message.correlation_id, "success").await;

        let event_payload = ClientRegisteredPayload {
            id: client_id.to_string(),
            name: payload.name.clone(),
        };

        let event = BaseMessage::new(event_payload, None);

        let response_json = serde_json::to_string(&event).unwrap();
        let _ = send_all(&response_json).await;
    }
}

async fn handle_make_admin(client_id: &str, incoming_message: BaseMessage) {
	if let Err(_) = check_client_exists(client_id, &incoming_message.correlation_id).await {
        return;
    }

    if let Ok(payload) = validate_payload::<MakeAdminPayload>(
        client_id,
        &incoming_message.correlation_id,
        incoming_message.payload,
    )
    .await
    {
		if payload.admin_password != get_admin_password()
		{
			send_status(
                client_id,
                &incoming_message.correlation_id,
                "wrongPasswordError",
            )
            .await;
            return;
		}

        let is_made_admin = make_admin(&payload.client_id);

        if !is_made_admin {
            send_status(
                client_id,
                &incoming_message.correlation_id,
                "missingClientError",
            )
            .await;
            return;
        }

        let _ = send_status(client_id, &incoming_message.correlation_id, "success").await;

        let event_payload = AdminMadePayload {
            id: client_id.to_string(),
        };

        let event = BaseMessage::new(event_payload, None);

        let response_json = serde_json::to_string(&event).unwrap();
        let _ = send_all(&response_json).await;
    }
}

async fn handle_get_client_list(client_id: &str, incoming_message: BaseMessage) {
    if let Err(_) = check_client_exists(client_id, &incoming_message.correlation_id).await {
        return;
    }

    let client_list = get_client_list()
        .into_iter()
        .map(|client| ClientInfo {
            id: client.id.to_string(),
            name: client.name.clone(),
        })
        .collect();

    let response_payload = ClientListPayload {
        clients: client_list,
    };

    let response = BaseMessage::new(response_payload, Some(incoming_message.correlation_id.clone()));

    let response_json = serde_json::to_string(&response).unwrap();
    let _ = send(&client_id, &response_json).await;
}

async fn handle_send_chat(client_id: &str, incoming_message: BaseMessage) {
    if let Err(_) = check_client_exists(client_id, &incoming_message.correlation_id).await {
        return;
    }

    if let Ok(payload) = validate_payload::<SendChatPayload>(
        client_id,
        &incoming_message.correlation_id,
        incoming_message.payload,
    )
    .await
    {
        let event_payload = ChatSentPayload {
            id: client_id.to_string(),
            message: payload.message.clone(),
        };

        let event = BaseMessage::new(event_payload, None);

        let response_json = serde_json::to_string(&event).unwrap();
        let _ = send_all(&response_json).await;
    }
}

async fn handle_unknown_message(client_id: &str, incoming_message: BaseMessage) {
    send_status(
        client_id,
        &incoming_message.correlation_id,
        "unknownMessageError",
    )
    .await;
}

async fn check_client_exists(client_id: &str, correlation_id: &str) -> Result<(), ()> {
    if !client_exists(client_id) {
        send_status(client_id, correlation_id, "notRegisteredError").await;
        return Err(());
    }
    Ok(())
}

async fn validate_payload<T: DeserializeOwned>(
    client_id: &str,
    correlation_id: &str,
    payload: Option<Value>,
) -> Result<T, ()> {
    match payload {
        Some(payload_value) => match serde_json::from_value::<T>(payload_value) {
            Ok(valid_payload) => Ok(valid_payload),
            Err(_) => {
                send_status(client_id, correlation_id, "wrongPayloadError").await;
                Err(())
            }
        },
        None => {
            send_status(client_id, correlation_id, "missingPayloadError").await;
            Err(())
        }
    }
}

async fn send_status(client_id: &str, correlation_id: &str, status: &str) {
    let response_payload = StatusPayload {
        status: status.to_string(),
    };

    let message = BaseMessage::new(response_payload, Some(correlation_id.to_string()));

    let response_json = serde_json::to_string(&message).unwrap();
    let _ = send(&client_id, &response_json).await;
}

async fn send(client_id: &str, message: &str) -> Result<(), String> {
    let connections = clients_connections();
    let connections_lock = connections.lock().await;

    if let Some(client_write) = connections_lock.get(client_id) {
        let mut write = client_write.lock().await;
        write
            .send(Message::text(message))
            .await
            .map_err(|e| e.to_string())
    } else {
        Err(format!("Client with ID {} not found", client_id))
    }
}

async fn send_all(message: &str) {
    let connections = clients_connections();
    let connections_lock = connections.lock().await;

    for (client_id, client_write) in connections_lock.iter() {
        let mut write = client_write.lock().await;
        if let Err(e) = write.send(Message::text(message)).await {
            eprintln!("Error sending message to {}: {}", client_id, e);
        }
    }
}

fn log(client_name: &str, action: &str, ip: &str) {
    println!(
        "{:<20} {:<15} {:<15}",
        ip.yellow(),
        client_name.blue(),
        action.green(),
    );
}

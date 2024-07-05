use futures_util::{SinkExt, StreamExt};
use serde_json;
use tokio::net::TcpListener;
use tokio_tungstenite::accept_async;
use app_lib::server_logic::{add_client, get_client_list, remove_client, initialize, CLIENT_LIST, ClientList};
use app_lib::structures::{BaseMessage, RegisterClientPayload, StatusPayload, ClientListPayload, ClientInfo};
use colored::*;

#[tokio::main]
pub async fn main() {
    initialize();
    let listener = TcpListener::bind("0.0.0.0:8080")
        .await
        .expect("Failed to bind");
    println!("WebSocket server listening on ws://0.0.0.0:8080");

    while let Ok((stream, _)) = listener.accept().await {
        let clients = CLIENT_LIST.get().unwrap().clone();
        tokio::spawn(handle_connection(stream, clients));
    }
}

async fn handle_connection(stream: tokio::net::TcpStream, clients: ClientList) {
    let ws_stream = accept_async(stream).await.expect("Failed to accept");
    let peer_addr = ws_stream.get_ref().peer_addr().unwrap();
    log("???", "connected", &peer_addr.to_string());

    let (mut write, mut read) = ws_stream.split();
    let mut registered_client_id: Option<String> = None;
    let mut registered_client_name: Option<String> = None;

    while let Some(message) = read.next().await {
        let message = match message {
            Ok(msg) => msg,
            Err(_) => {
                let error_message = create_error_message(String::new(), "Error receiving message".to_string());
                let error_json = serde_json::to_string(&error_message).unwrap();
                let _ = write.send(error_json.into()).await;
                continue;
            }
        };

        let message_str = match message.to_text() {
            Ok(text) => text,
            Err(_) => {
                let error_message = create_error_message(String::new(), "Received invalid text message".to_string());
                let error_json = serde_json::to_string(&error_message).unwrap();
                let _ = write.send(error_json.into()).await;
                continue;
            }
        };

        let incoming_message = match serde_json::from_str::<BaseMessage>(message_str) {
            Ok(msg) => msg,
            Err(_) => {
                let error_message = create_error_message(String::new(), "Received invalid JSON message".to_string());
                let error_json = serde_json::to_string(&error_message).unwrap();
                let _ = write.send(error_json.into()).await;
                continue;
            }
        };

        if let Some(client_name) = &registered_client_name {
            log(client_name, &incoming_message.message_type, &peer_addr.to_string());
        } else {
            log("???", &incoming_message.message_type, &peer_addr.to_string());
        }

        let response = match incoming_message.message_type.as_str() {
            "registerClient" => handle_register_client(
                &clients, &mut registered_client_id, &mut registered_client_name, incoming_message).await,
            "getClientList" => handle_get_client_list(
                &clients, &registered_client_id, incoming_message).await,
            _ => handle_unknown_message(incoming_message),
        };

        let response_json = serde_json::to_string(&response).unwrap();
        let _ = write.send(response_json.into()).await;
    }

    if let Some(client_id) = registered_client_id {
        remove_client(&clients, &client_id);
    }

    if let Some(client_name) = registered_client_name {
        log(&client_name, "disconnected", &peer_addr.to_string());
    } else {
        log("???", "disconnected", &peer_addr.to_string());
    }
}

async fn handle_register_client(
    clients: &ClientList,
    registered_client_id: &mut Option<String>,
    registered_client_name: &mut Option<String>,
    incoming_message: BaseMessage
) -> BaseMessage {
    if registered_client_id.is_none() {
        match incoming_message.payload {
            Some(payload) => {
                match serde_json::from_value::<RegisterClientPayload>(payload) {
                    Ok(payload) => {
                        let client_id = add_client(clients, payload.name.clone());

                        let response_payload = StatusPayload {
                            status: "success".to_string(),
                            info: None,
                        };

                        let response = BaseMessage {
                            correlation_id: incoming_message.correlation_id,
                            message_type: "status".to_string(),
                            payload: Some(serde_json::to_value(response_payload).unwrap()),
                        };

                        *registered_client_id = Some(client_id);
                        *registered_client_name = Some(payload.name);
                        response
                    }
                    Err(_) => create_error_message(incoming_message.correlation_id, "Wrong payload".to_string()),
                }
            }
            None => create_error_message(incoming_message.correlation_id, "Missing payload".to_string()),
        }
    } else {
        create_error_message(incoming_message.correlation_id, "Client already registered".to_string())
    }
}

async fn handle_get_client_list(
    clients: &ClientList,
    registered_client_id: &Option<String>,
    incoming_message: BaseMessage
) -> BaseMessage {
    if registered_client_id.is_some() {
        let client_list = get_client_list(clients)
            .into_iter()
            .map(|client| ClientInfo { name: client.name })
            .collect();

        let response_payload = ClientListPayload { clients: client_list };

        let response = BaseMessage {
            correlation_id: incoming_message.correlation_id,
            message_type: "clientList".to_string(),
            payload: Some(serde_json::to_value(response_payload).unwrap()),
        };

        response
    } else {
        create_error_message(incoming_message.correlation_id, "Received getClientList message before client registration".to_string())
    }
}

fn handle_unknown_message(incoming_message: BaseMessage) -> BaseMessage {
    create_error_message(incoming_message.correlation_id, "Unknown message type".to_string())
}

fn create_error_message(correlation_id: String, info: String) -> BaseMessage {
    let response_payload = StatusPayload {
        status: "error".to_string(),
        info: Some(info),
    };

    BaseMessage {
        correlation_id,
        message_type: "status".to_string(),
        payload: Some(serde_json::to_value(response_payload).unwrap()),
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

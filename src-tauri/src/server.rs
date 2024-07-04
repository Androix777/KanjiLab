use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::net::TcpListener;
use tokio_tungstenite::accept_async;
use uuid::Uuid;

#[derive(Serialize, Deserialize)]
struct BaseMessage {
    correlation_id: String,
    message_type: String,
    payload: serde_json::Value,
}

#[derive(Deserialize)]
struct RegisterClientPayload {
    name: String,
}

#[derive(Serialize)]
struct StatusPayload {
    status: String,
}

#[derive(Serialize)]
struct ClientListPayload {
    clients: Vec<ClientInfo>,
}

#[derive(Serialize)]
struct ClientInfo {
    id: String,
    name: String,
}

struct Client {
    id: String,
    name: String,
}

type ClientList = Arc<Mutex<HashMap<String, Client>>>;

#[tokio::main]
pub async fn main() {
    let listener = TcpListener::bind("0.0.0.0:8080")
        .await
        .expect("Failed to bind");
    println!("WebSocket server listening on ws://0.0.0.0:8080");

    let clients: ClientList = Arc::new(Mutex::new(HashMap::new()));

    while let Ok((stream, _)) = listener.accept().await {
        let clients = clients.clone();
        tokio::spawn(handle_connection(stream, clients));
    }
}

async fn handle_connection(stream: tokio::net::TcpStream, clients: ClientList) {
    let ws_stream = accept_async(stream).await.expect("Failed to accept");
    println!(
        "New WebSocket connection: {}",
        ws_stream.get_ref().peer_addr().unwrap()
    );

    let (mut write, mut read) = ws_stream.split();
    let mut registered_client_id: Option<String> = None;

    while let Some(message) = read.next().await {
        let message = message.unwrap();
        let message_str = message.to_text().unwrap();

        if let Ok(incoming_message) = serde_json::from_str::<BaseMessage>(message_str) {
            match incoming_message.message_type.as_str() {
                "registerClient" => {
                    if registered_client_id.is_none() {
                        if let Ok(payload) =
                            serde_json::from_value::<RegisterClientPayload>(incoming_message.payload)
                        {
                            let response = register_client(&clients, payload, incoming_message.correlation_id);
                            registered_client_id = Some(response.payload["client_id"].as_str().unwrap().to_string());
                            let response_json = serde_json::to_string(&response).unwrap();
                            write.send(response_json.into()).await.unwrap();
                        } else {
                            let response = send_error(incoming_message.correlation_id);
                            let response_json = serde_json::to_string(&response).unwrap();
                            write.send(response_json.into()).await.unwrap();
                            println!("Wrong payload");
                        }
                    } else {
                        let response = send_error(incoming_message.correlation_id);
                        let response_json = serde_json::to_string(&response).unwrap();
                        write.send(response_json.into()).await.unwrap();
                        println!("Client already registered");
                    }
                }
                "getClientList" => {
                    if registered_client_id.is_some() {
                        let response = get_client_list(&clients, incoming_message.correlation_id);
                        let response_json = serde_json::to_string(&response).unwrap();
                        write.send(response_json.into()).await.unwrap();
                    } else {
                        let response = send_error(incoming_message.correlation_id);
                        let response_json = serde_json::to_string(&response).unwrap();
                        write.send(response_json.into()).await.unwrap();
                        println!("Received getClientList message before client registration");
                    }
                }
                _ => {
                    let response = send_error(incoming_message.correlation_id);
                    let response_json = serde_json::to_string(&response).unwrap();
                    write.send(response_json.into()).await.unwrap();
                    println!(
                        "Received unknown message type: {}",
                        incoming_message.message_type
                    );
                }
            }
        } else {
            println!("Received invalid JSON message");
        }
    }

    if let Some(client_id) = registered_client_id {
        clients.lock().unwrap().remove(&client_id);
        println!("Client {} disconnected and removed", client_id);
    }

    println!("WebSocket connection closed");
}

fn register_client(
    clients: &ClientList,
    payload: RegisterClientPayload,
    correlation_id: String,
) -> BaseMessage {
    let client_id = Uuid::new_v4().to_string();
    let client = Client {
        id: client_id.clone(),
        name: payload.name.clone(),
    };

    clients.lock().unwrap().insert(client_id.clone(), client);

    let response_payload = serde_json::json!({
        "status": "success",
        "client_id": client_id,
    });

    let response = BaseMessage {
        correlation_id,
        message_type: "status".to_string(),
        payload: response_payload,
    };

    println!("Registered client: {} (ID: {})", payload.name, client_id);
    print_client_list(clients);

    response
}

fn get_client_list(clients: &ClientList, correlation_id: String) -> BaseMessage {
    let clients_lock = clients.lock().unwrap();
    let client_list: Vec<ClientInfo> = clients_lock
        .iter()
        .map(|(_, client)| ClientInfo {
            id: client.id.clone(),
            name: client.name.clone(),
        })
        .collect();

    let response_payload = ClientListPayload { clients: client_list };

    let response = BaseMessage {
        correlation_id,
        message_type: "clientList".to_string(),
        payload: serde_json::to_value(response_payload).unwrap(),
    };

    response
}

fn print_client_list(clients: &ClientList) {
    let clients_lock = clients.lock().unwrap();
    println!("#### Registered Clients ####");
    for (id, client) in clients_lock.iter() {
        println!("ID: {}, Name: {}", id, client.name);
    }
    println!("###########################");
}

fn send_error(correlation_id: String) -> BaseMessage {
    let response_payload = StatusPayload {
        status: "error".to_string(),
    };

    let response = BaseMessage {
        correlation_id,
        message_type: "status".to_string(),
        payload: serde_json::to_value(response_payload).unwrap(),
    };

    response
}

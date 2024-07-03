use tokio::net::TcpListener;
use tokio_tungstenite::accept_async;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Deserialize)]
struct IncomingMessage {
    #[serde(rename = "type")]
    message_type: String,
    payload: serde_json::Value,
}

#[derive(Deserialize)]
struct RegisterClientPayload {
    name: String,
}

#[derive(Serialize)]
struct OutgoingMessage {
    #[serde(rename = "type")]
    message_type: String,
    payload: serde_json::Value,
}

struct Client {
    id: String,
    name: String,
}

type ClientList = Arc<Mutex<HashMap<String, Client>>>;

#[tokio::main]
pub async fn main() {
    let listener = TcpListener::bind("127.0.0.1:8080").await.expect("Failed to bind");
    println!("WebSocket server listening on ws://127.0.0.1:8080");

    let clients: ClientList = Arc::new(Mutex::new(HashMap::new()));

    while let Ok((stream, _)) = listener.accept().await {
        let clients = clients.clone();
        tokio::spawn(handle_connection(stream, clients));
    }
}

async fn handle_connection(stream: tokio::net::TcpStream, clients: ClientList) {
    let ws_stream = accept_async(stream).await.expect("Failed to accept");
    println!("New WebSocket connection: {}", ws_stream.get_ref().peer_addr().unwrap());

    let (mut write, mut read) = ws_stream.split();

    while let Some(message) = read.next().await {
        let message = message.unwrap();
        let message_str = message.to_text().unwrap();

        if let Ok(incoming_message) = serde_json::from_str::<IncomingMessage>(message_str) {
            match incoming_message.message_type.as_str() {
                "registerClient" => {
                    if let Ok(payload) = serde_json::from_value::<RegisterClientPayload>(incoming_message.payload) {
                        let client_id = Uuid::new_v4().to_string();
                        let client = Client {
                            id: client_id.clone(),
                            name: payload.name.clone(),
                        };

                        clients.lock().unwrap().insert(client_id.clone(), client);

                        let response = OutgoingMessage {
                            message_type: "clientRegistered".to_string(),
                            payload: serde_json::json!({
                                "id": client_id,
                                "name": payload.name
                            }),
                        };
                        let response_json = serde_json::to_string(&response).unwrap();
                        write.send(response_json.into()).await.unwrap();
                        println!("Registered client: {} (ID: {})", payload.name, client_id);
                    }
                }
                _ => {
                    println!("Received unknown message type: {}", incoming_message.message_type);
                }
            }
        } else {
            println!("Received invalid JSON message");
        }
    }

    println!("WebSocket connection closed");
}

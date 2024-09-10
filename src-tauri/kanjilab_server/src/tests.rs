#[cfg(test)]
mod test_utils {
    use crate::server_logic::get_admin_password;
    use crate::structures::{
        BaseMessage, ClientInfo, InReqClientListPayload, InReqMakeAdminPayload,
        InReqRegisterClientPayload, MessageType, OutNotifAdminMadePayload,
        OutNotifClientDisconnectedPayload, OutNotifClientRegisteredPayload,
        OutRespClientListPayload, OutRespClientRegisteredPayload, OutRespStatusPayload,
    };
    use futures_util::{SinkExt, StreamExt};
    use serde::Serialize;
    use std::time::Duration;
    use tokio::net::TcpStream;
    use tokio::time::timeout;
    use tokio_tungstenite::{
        connect_async, tungstenite::protocol::Message, MaybeTlsStream, WebSocketStream,
    };
    use uuid::Uuid;

    pub struct TestClient {
        ws_stream: WebSocketStream<MaybeTlsStream<TcpStream>>,
        pub client_id: Option<String>,
        pub client_name: Option<String>,
    }

    impl TestClient {
        pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
            let (ws_stream, _) = connect_async("ws://127.0.0.1:8080").await?;
            Ok(Self {
                ws_stream,
                client_id: None,
                client_name: None,
            })
        }

        pub async fn disconnect(&mut self) -> Result<(), Box<dyn std::error::Error>> {
            self.ws_stream.close(None).await?;
            Ok(())
        }

        pub async fn reconnect(&mut self) -> Result<(), Box<dyn std::error::Error>> {
            let (new_ws_stream, _) = connect_async("ws://127.0.0.1:8080").await?;
            self.ws_stream = new_ws_stream;
            Ok(())
        }

        pub fn set_id(&mut self, id: String) {
            self.client_id = Some(id);
        }

        pub fn set_name(&mut self, name: String) {
            self.client_name = Some(name);
        }
    }

    pub struct ResponseAnalyzer<T> {
        responses: Vec<(usize, T)>,
    }

    impl<T> ResponseAnalyzer<T> {
        pub fn new(responses: Vec<(usize, T)>) -> Self {
            Self { responses }
        }

        pub fn validate<F>(
            self,
            clients: &mut Vec<TestClient>,
            validator: F,
        ) -> Result<Self, String>
        where
            F: Fn(usize, &T, &mut Vec<TestClient>) -> bool,
        {
            for (index, response) in &self.responses {
                if !validator(*index, response, clients) {
                    return Err(format!("Client {}: Response failed validation", index));
                }
            }
            Ok(self)
        }
    }

    pub async fn send_message<T: MessageType + Serialize>(
        clients: &mut Vec<TestClient>,
        indices: &[usize],
        payload: T,
    ) {
        let message = BaseMessage::new(payload, None);
        let json = serde_json::to_string(&message).expect("Failed to serialize message");

        for &index in indices {
            if index < clients.len() {
                clients[index]
                    .ws_stream
                    .send(Message::Text(json.clone()))
                    .await
                    .expect("Failed to send message");
            }
        }
    }

    pub async fn check_received_message<T: MessageType + for<'de> serde::Deserialize<'de>>(
        clients: &mut Vec<TestClient>,
        indices: &[usize],
    ) -> Result<ResponseAnalyzer<T>, String> {
        let mut results = Vec::new();

        for &index in indices {
            if index < clients.len() {
                match timeout(Duration::from_secs(5), clients[index].ws_stream.next()).await {
                    Ok(Some(Ok(message))) => {
                        if let Message::Text(text) = message {
                            let base_message: BaseMessage =
                                serde_json::from_str(&text).map_err(|e| {
                                    format!(
                                        "Client {}: Failed to deserialize message: {}",
                                        index, e
                                    )
                                })?;

                            if base_message.message_type == T::MESSAGE_TYPE {
                                if let Some(payload) = base_message.payload {
                                    let parsed: T =
                                        serde_json::from_value(payload).map_err(|e| {
                                            format!(
                                                "Client {}: Failed to deserialize payload: {}",
                                                index, e
                                            )
                                        })?;
                                    results.push((index, parsed));
                                } else {
                                    return Err(format!(
                                        "Client {}: Expected payload is missing",
                                        index
                                    ));
                                }
                            } else {
                                return Err(format!(
                                    "Client {}: Unexpected message type: {}",
                                    index, base_message.message_type
                                ));
                            }
                        } else {
                            return Err(format!("Client {}: Received non-text message", index));
                        }
                    }
                    Ok(Some(Err(e))) => {
                        return Err(format!("Client {}: WebSocket error: {}", index, e))
                    }
                    Ok(None) => {
                        return Err(format!(
                            "Client {}: WebSocket stream ended unexpectedly",
                            index
                        ))
                    }
                    Err(_) => return Err(format!("Client {}: Timeout waiting for message", index)),
                }
            }
        }
        Ok(ResponseAnalyzer::new(results))
    }

    pub async fn check_no_message(
        clients: &mut Vec<TestClient>,
        indices: &[usize],
        timeout_duration: Duration,
    ) -> Result<(), String> {
        for &index in indices {
            if index < clients.len() {
                match timeout(timeout_duration, clients[index].ws_stream.next()).await {
                    Ok(Some(_)) => {
                        return Err(format!("Client {}: Unexpected message received", index))
                    }
                    Ok(None) => {
                        return Err(format!(
                            "Client {}: WebSocket stream ended unexpectedly",
                            index
                        ))
                    }
                    Err(_) => {} // Timeout occurred, which is what we want
                }
            }
        }
        Ok(())
    }

    #[tokio::test]
    async fn test_client_interactions() {
        let server_handle = tokio::spawn(async {
            crate::server::call_launch_server().await;
        });

        // Create clients
        let mut clients = vec![
            TestClient::new().await.unwrap(),
            TestClient::new().await.unwrap(),
            TestClient::new().await.unwrap(),
        ];

        // Register client 0
        send_message(
            &mut clients,
            &[0],
            InReqRegisterClientPayload {
                name: "Client0".to_string(),
            },
        )
        .await;

        check_received_message::<OutRespClientRegisteredPayload>(&mut clients, &[0])
            .await
            .unwrap()
            .validate(&mut clients, |index, response, clients| {
                clients[index].set_id(response.id.clone());
                clients[index].set_name("Client0".to_string());
                Uuid::parse_str(&response.id).is_ok()
            })
            .unwrap();

        check_received_message::<OutNotifClientRegisteredPayload>(&mut clients, &[0])
            .await
            .unwrap()
            .validate(&mut clients, |_index, response, clients| {
                &response.id == clients[0].client_id.as_ref().unwrap()
                    && &response.name == clients[0].client_name.as_ref().unwrap()
            })
            .unwrap();

        check_no_message(&mut clients, &[1, 2], Duration::from_secs(1))
            .await
            .unwrap();

        // Register client 1
        send_message(
            &mut clients,
            &[1],
            InReqRegisterClientPayload {
                name: "Client1".to_string(),
            },
        )
        .await;

        check_received_message::<OutRespClientRegisteredPayload>(&mut clients, &[1])
            .await
            .unwrap()
            .validate(&mut clients, |index, response, clients| {
                clients[index].set_id(response.id.clone());
                clients[index].set_name("Client1".to_string());
                Uuid::parse_str(&response.id).is_ok()
            })
            .unwrap();

        check_received_message::<OutNotifClientRegisteredPayload>(&mut clients, &[0, 1])
            .await
            .unwrap()
            .validate(&mut clients, |_index, response, clients| {
                &response.id == clients[1].client_id.as_ref().unwrap()
                    && &response.name == clients[1].client_name.as_ref().unwrap()
            })
            .unwrap();

        check_no_message(&mut clients, &[2], Duration::from_secs(1))
            .await
            .unwrap();

        // Register client 2
        send_message(
            &mut clients,
            &[2],
            InReqRegisterClientPayload {
                name: "Client2".to_string(),
            },
        )
        .await;

        check_received_message::<OutRespClientRegisteredPayload>(&mut clients, &[2])
            .await
            .unwrap()
            .validate(&mut clients, |index, response, clients| {
                clients[index].set_id(response.id.clone());
                clients[index].set_name("Client2".to_string());
                Uuid::parse_str(&response.id).is_ok()
            })
            .unwrap();

        check_received_message::<OutNotifClientRegisteredPayload>(&mut clients, &[0, 1, 2])
            .await
            .unwrap()
            .validate(&mut clients, |_index, response, clients| {
                &response.id == clients[2].client_id.as_ref().unwrap()
                    && &response.name == clients[2].client_name.as_ref().unwrap()
            })
            .unwrap();

        // Disconnect/reconnect client 1

        clients[1].disconnect().await.unwrap();

        check_received_message::<OutNotifClientDisconnectedPayload>(&mut clients, &[0, 2])
            .await
            .unwrap()
            .validate(&mut clients, |_index, response, clients| {
                &response.id == clients[1].client_id.as_ref().unwrap()
                    && &response.name == clients[1].client_name.as_ref().unwrap()
            })
            .unwrap();

        clients[1].reconnect().await.unwrap();

        send_message(
            &mut clients,
            &[1],
            InReqRegisterClientPayload {
                name: "Client1new".to_string(),
            },
        )
        .await;

        check_received_message::<OutRespClientRegisteredPayload>(&mut clients, &[1])
            .await
            .unwrap()
            .validate(&mut clients, |index, response, clients| {
                clients[index].set_id(response.id.clone());
                clients[index].set_name("Client1new".to_string());
                Uuid::parse_str(&response.id).is_ok()
            })
            .unwrap();
        check_received_message::<OutNotifClientRegisteredPayload>(&mut clients, &[0, 1, 2])
            .await
            .unwrap()
            .validate(&mut clients, |_index, response, clients| {
                &response.id == clients[1].client_id.as_ref().unwrap()
                    && &response.name == clients[1].client_name.as_ref().unwrap()
            })
            .unwrap();

        // Make Client 0 admin

        let id = clients[0].client_id.as_ref().unwrap().to_string();
        send_message(
            &mut clients,
            &[0],
            InReqMakeAdminPayload {
                admin_password: "wrong".to_string(),
                client_id: id.clone(),
            },
        )
        .await;

        check_received_message::<OutRespStatusPayload>(&mut clients, &[0])
            .await
            .unwrap()
            .validate(&mut clients, |_index, response, _clients| {
                &response.status == "wrongPasswordError"
            })
            .unwrap();

        send_message(
            &mut clients,
            &[0],
            InReqMakeAdminPayload {
                admin_password: get_admin_password(),
                client_id: id.clone(),
            },
        )
        .await;

        check_received_message::<OutRespStatusPayload>(&mut clients, &[0])
            .await
            .unwrap()
            .validate(&mut clients, |_index, response, _clients| {
                &response.status == "success"
            })
            .unwrap();

        check_received_message::<OutNotifAdminMadePayload>(&mut clients, &[0, 1, 2])
            .await
            .unwrap()
            .validate(&mut clients, |_index, response, clients| {
                &response.id == clients[0].client_id.as_ref().unwrap()
            })
            .unwrap();

        // Client 0 check clients list

        send_message(&mut clients, &[0, 1, 2], InReqClientListPayload {}).await;

        check_received_message::<OutRespClientListPayload>(&mut clients, &[0, 1, 2])
            .await
            .unwrap()
            .validate(
                &mut clients,
                |_index, response, clients: &mut Vec<TestClient>| {
                    if response.clients.len() != 3 {
                        return false;
                    }

                    let expected_clients = vec![
                        ClientInfo {
                            id: clients[0].client_id.as_ref().unwrap().clone(),
                            name: clients[0].client_name.as_ref().unwrap().clone(),
                            is_admin: true,
                        },
                        ClientInfo {
                            id: clients[1].client_id.as_ref().unwrap().clone(),
                            name: clients[1].client_name.as_ref().unwrap().clone(),
                            is_admin: false,
                        },
                        ClientInfo {
                            id: clients[2].client_id.as_ref().unwrap().clone(),
                            name: clients[2].client_name.as_ref().unwrap().clone(),
                            is_admin: false,
                        },
                    ];

                    expected_clients
                        .iter()
                        .all(|expected| response.clients.iter().any(|client| client == expected))
                },
            )
            .unwrap();

        crate::server::call_stop_server().await;
        let _ = server_handle.await;
    }
}

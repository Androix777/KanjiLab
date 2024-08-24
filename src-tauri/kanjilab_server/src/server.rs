use crate::server_logic::*;
use crate::structures::*;
use futures_util::stream::SplitSink;
use futures_util::{SinkExt, StreamExt};
use serde::de::DeserializeOwned;
use serde_json::{self, Value};
use std::collections::HashMap;
use std::future::Future;
use std::sync::{Arc, LazyLock};
use tokio::net::{TcpListener, TcpStream};
use tokio::runtime::Runtime;
use tokio::sync::{oneshot, Mutex};
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{accept_async, WebSocketStream};
use uuid::Uuid;

pub static SERVER_HANDLE: LazyLock<Arc<Mutex<Option<oneshot::Sender<()>>>>> =
    LazyLock::new(|| Arc::new(Mutex::new(None)));

pub type ClientWrite = Arc<Mutex<SplitSink<WebSocketStream<TcpStream>, Message>>>;
pub type ClientsConnections = Arc<Mutex<HashMap<String, ClientWrite>>>;
pub type ClientsResponses = Arc<Mutex<HashMap<String, Arc<Mutex<PendingResponses>>>>>;

pub static CLIENTS_CONNECTIONS: LazyLock<ClientsConnections> = LazyLock::new(|| Default::default());
pub static CLIENTS_RESPONSES: LazyLock<ClientsResponses> = LazyLock::new(|| Default::default());
pub static IS_AUTO_SERVER: LazyLock<Arc<Mutex<bool>>> = LazyLock::new(|| Default::default());

pub struct PendingResponses {
    callbacks: HashMap<String, oneshot::Sender<BaseMessage>>,
}

impl PendingResponses {
    fn new() -> Self {
        Self {
            callbacks: HashMap::new(),
        }
    }

    fn insert(&mut self, correlation_id: String) -> oneshot::Receiver<BaseMessage> {
        let (tx, rx) = oneshot::channel();
        self.callbacks.insert(correlation_id, tx);
        rx
    }

    fn complete(&mut self, message: BaseMessage) -> bool {
        if let Some(callback) = self.callbacks.remove(&message.correlation_id) {
            let _ = callback.send(message);
            true
        } else {
            false
        }
    }
}

// #region ServerControl

pub async fn call_launch_server() {
    let rt = Runtime::new().unwrap();
    let (stop_tx, stop_rx) = oneshot::channel();
    let (start_tx, start_rx) = oneshot::channel();

    let mut handle = SERVER_HANDLE.lock().await;
    *handle = Some(stop_tx);

    std::thread::spawn(move || {
        rt.block_on(async {
            launch_server(stop_rx, start_tx).await;
        });
    });

    start_rx.await.expect("Failed to receive start signal");
}

pub async fn call_stop_server() {
    if let Some(tx) = SERVER_HANDLE.lock().await.take() {
        let _ = tx.send(());
    }
}

async fn disconnect_all_clients() {
    let mut connections_lock = CLIENTS_CONNECTIONS.lock().await;

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
    let mut game_state_receiver = subscribe_to_game_state();

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
        _ = async {
            while let Ok(game_state) = game_state_receiver.recv().await {
                handle_game_state_update(game_state).await;
            }
        } => {},
    }
}

async fn handle_connection(stream: tokio::net::TcpStream) {
    let ws_stream = accept_async(stream).await.expect("Failed to accept");
    let _peer_addr = ws_stream.get_ref().peer_addr().unwrap();

    let (write, mut read) = ws_stream.split();
    let client_id = Uuid::new_v4().to_string();
    log("???", "connected", &client_id, true);
    CLIENTS_CONNECTIONS
        .lock()
        .await
        .insert(client_id.clone(), Arc::new(Mutex::new(write)));

    let pending_responses = Arc::new(Mutex::new(PendingResponses::new()));
    CLIENTS_RESPONSES
        .lock()
        .await
        .insert(client_id.clone(), Arc::clone(&pending_responses));

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
                &client_id,
                true,
            );
        } else {
            log("???", &incoming_message.message_type, &client_id, true);
        }

        let pending_responses_clone = Arc::clone(&pending_responses);
        if pending_responses_clone
            .lock()
            .await
            .complete(incoming_message.clone())
        {
            continue;
        }

        match incoming_message.message_type.as_str() {
            "IN_REQ_registerClient" => handle_register_client(&client_id, incoming_message).await,
            "IN_REQ_clientList" => handle_get_client_list(&client_id, incoming_message).await,
            "IN_REQ_sendChat" => handle_send_chat(&client_id, incoming_message).await,
            "IN_REQ_makeAdmin" => handle_make_admin(&client_id, incoming_message).await,
            "IN_REQ_startGame" => handle_start_game(&client_id, incoming_message).await,
            "IN_REQ_stopGame" => handle_stop_game(&client_id, incoming_message).await,
            "IN_REQ_sendAnswer" => handle_send_answer(&client_id, incoming_message).await,
            "IN_REQ_sendGameSettings" => {
                handle_send_game_settings(&client_id, incoming_message).await
            }
            _ => handle_unknown_message(&client_id, incoming_message).await,
        };
    }

    let deleted_client: Option<Client>;
    if let Some(client) = get_client(&client_id) {
        log(&client.name, "disconnected", &client_id, true);
        deleted_client = Some(client);
    } else {
        log("???", "disconnected", &client_id, true);
        deleted_client = None;
    }

    remove_client(&client_id);
    CLIENTS_CONNECTIONS.lock().await.remove(&client_id);

    if let Some(client) = deleted_client {
        let event_payload = OutNotifClientDisconnectedPayload {
            id: client_id.to_string(),
            name: client.name.clone(),
        };

        let event = BaseMessage::new(event_payload, None);

        send_all(event).await;
    }
}

async fn handle_game_state_update(game_state: GameState) {
    match game_state {
        GameState::WaitingQuestion => handle_state_waiting_question().await,
        GameState::GameStarting => handle_state_game_starting().await,
        GameState::Lobby => handle_state_lobby().await,
        _ => (),
    }
}
// #endregion

// #region Handlers

async fn handle_register_client(client_id: &str, incoming_message: BaseMessage) {
    if let Ok(payload) = validate_payload::<InReqRegisterClientPayload>(
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

        let response_payload = OutRespClientRegisteredPayload {
            id: client_id.to_string(),
        };
        let response = BaseMessage::new(
            response_payload,
            Some(incoming_message.correlation_id.clone()),
        );
        send(client_id, response).await;

        let event_payload = OutNotifClientRegisteredPayload {
            id: client_id.to_string(),
            name: payload.name.clone(),
        };
        let event = BaseMessage::new(event_payload, None);
        send_all(event).await;

        if *IS_AUTO_SERVER.lock().await && get_admin_id().is_none() {
            let payload = InReqMakeAdminPayload {
                admin_password: get_admin_password(),
                client_id: client_id.to_string(),
            };
            handle_make_admin(&client_id, BaseMessage::new(payload, None)).await;
        }
    }
}

async fn handle_make_admin(client_id: &str, incoming_message: BaseMessage) {
    if let Err(_) = check_client_exists(client_id, &incoming_message.correlation_id).await {
        return;
    }

    if let Ok(payload) = validate_payload::<InReqMakeAdminPayload>(
        client_id,
        &incoming_message.correlation_id,
        incoming_message.payload,
    )
    .await
    {
        if payload.admin_password != get_admin_password() {
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

        send_status(client_id, &incoming_message.correlation_id, "success").await;

        let event_payload = OutNotifAdminMadePayload {
            id: client_id.to_string(),
        };

        let event = BaseMessage::new(event_payload, None);

        send_all(event).await;
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
            is_admin: client.is_admin,
        })
        .collect();

    let response_payload = OutRespClientListPayload {
        clients: client_list,
    };

    let response = BaseMessage::new(
        response_payload,
        Some(incoming_message.correlation_id.clone()),
    );

    send(&client_id, response).await;
}

async fn handle_send_chat(client_id: &str, incoming_message: BaseMessage) {
    if let Err(_) = check_client_exists(client_id, &incoming_message.correlation_id).await {
        return;
    }

    if let Ok(payload) = validate_payload::<InReqSendChatPayload>(
        client_id,
        &incoming_message.correlation_id,
        incoming_message.payload,
    )
    .await
    {
        let event_payload = OutNotifChatSentPayload {
            id: client_id.to_string(),
            message: payload.message.clone(),
        };

        let event = BaseMessage::new(event_payload, None);

        send_all(event).await;
    }
}

async fn handle_start_game(client_id: &str, incoming_message: BaseMessage) {
    if let Err(_) = check_client_exists(client_id, &incoming_message.correlation_id).await {
        return;
    }

    if let Err(_) = check_client_admin(client_id, &incoming_message.correlation_id).await {
        return;
    }

    if let Ok(payload) = validate_payload::<InReqStartGamePayload>(
        client_id,
        &incoming_message.correlation_id,
        incoming_message.payload,
    )
    .await
    {
        if get_game_state() != GameState::Lobby {
            send_status(
                client_id,
                &incoming_message.correlation_id,
                "alreadyStarted",
            )
            .await;
            return;
        }

        start_game(payload.game_settings);
        send_status(client_id, &incoming_message.correlation_id, "success").await;
    }
}

async fn handle_stop_game(client_id: &str, incoming_message: BaseMessage) {
    if let Err(_) = check_client_exists(client_id, &incoming_message.correlation_id).await {
        return;
    }

    if let Err(_) = check_client_admin(client_id, &incoming_message.correlation_id).await {
        return;
    }

    if get_game_state() == GameState::Lobby {
        send_status(
            client_id,
            &incoming_message.correlation_id,
            "alreadyStopped",
        )
        .await;
        return;
    }

    stop_game();
    send_status(client_id, &incoming_message.correlation_id, "success").await;
}

async fn handle_send_answer(client_id: &str, incoming_message: BaseMessage) {
    if let Err(_) = check_client_exists(client_id, &incoming_message.correlation_id).await {
        return;
    }

    if let Ok(payload) = validate_payload::<InReqSendAnswerPayload>(
        client_id,
        &incoming_message.correlation_id,
        incoming_message.payload,
    )
    .await
    {
        match record_answer(client_id, &payload.answer) {
            Ok(_is_correct) => {
                send_status(client_id, &incoming_message.correlation_id, "success").await;

                let event_payload = OutNotifClientAnsweredPayload {
                    id: client_id.to_string(),
                };
                let event = BaseMessage::new(event_payload, None);
                send_all(event).await;

                if all_clients_answered() {
                    end_round_early();
                }
            }
            Err(AnswerError::NoCurrentQuestion) => {
                send_status(client_id, &incoming_message.correlation_id, "noQuestion").await
            }
            Err(AnswerError::AlreadyAnswered) => {
                send_status(
                    client_id,
                    &incoming_message.correlation_id,
                    "alreadyAnswered",
                )
                .await
            }
        }
    }
}

async fn handle_send_game_settings(client_id: &str, incoming_message: BaseMessage) {
    if let Err(_) = check_client_exists(client_id, &incoming_message.correlation_id).await {
        return;
    }

    if let Ok(payload) = validate_payload::<InReqSendGameSettingsPayload>(
        client_id,
        &incoming_message.correlation_id,
        incoming_message.payload,
    )
    .await
    {
        let event_payload = OutNotifGameSettingsChangedPayload {
            game_settings: payload.game_settings,
        };
        let event = BaseMessage::new(event_payload, None);
        send_all(event).await;

        send_status(client_id, &incoming_message.correlation_id, "success").await;
    }
}

async fn handle_question(client_id: &str, incoming_message: BaseMessage) {
    if let Err(_) = check_client_exists(client_id, &incoming_message.correlation_id).await {
        return;
    }

    if let Ok(payload) = validate_payload::<InRespQuestionPayload>(
        client_id,
        &incoming_message.correlation_id,
        incoming_message.payload,
    )
    .await
    {
        if let Some(_) = get_question_for_round(get_current_round()) {
            send_status(client_id, &incoming_message.correlation_id, "alreadyExist").await;
            return;
        } else {
            set_current_question(payload.question.clone());

            let event_payload = OutNotifQuestionPayload {
                question_svg: payload.question_svg,
            };
            let event = BaseMessage::new(event_payload, None);
            send_all(event).await;
        }
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
// #endregion

// ##region StateHandles

async fn handle_state_waiting_question() {
    let event_payload = OutNotifRoundEndedPayload {
        question: get_question_for_round(get_current_round() - 1).unwrap(),
        answers: get_answers_for_round(get_current_round() - 1),
    };
    let event = BaseMessage::new(event_payload, None);
    send_all(event).await;

    request_question().await;
}

async fn handle_state_game_starting() {
    let event_payload = OutNotifGameStartedPayload {
        game_settings: get_game_settings(),
    };
    let event = BaseMessage::new(event_payload, None);
    send_all(event).await;

    request_question().await;
}

async fn handle_state_lobby() {
    let event_payload = OutNotifGameStoppedPayload {};
    let event = BaseMessage::new(event_payload, None);
    send_all(event).await;
}

// #endregion

// ##region Helpers

async fn request_question() {
    let clients_responses = CLIENTS_RESPONSES.lock().await;
    let admin_id = get_admin_id().unwrap();
    let pending_responses = clients_responses.get(&admin_id).unwrap();

    let message_payload = OutReqQuestionPayload {};
    let message = BaseMessage::new(message_payload, None);
    send_and_response(
        &admin_id,
        message,
        Arc::clone(&pending_responses),
        |response, client_id, _pending_responses| async move {
            handle_question(&client_id, response).await;
        },
    )
    .await;
}

async fn check_client_exists(client_id: &str, correlation_id: &str) -> Result<(), ()> {
    if !get_client(client_id).is_some() {
        send_status(client_id, correlation_id, "notRegisteredError").await;
        return Err(());
    }
    Ok(())
}

async fn check_client_admin(client_id: &str, correlation_id: &str) -> Result<(), ()> {
    if get_client(client_id).is_some_and(|x| x.is_admin) {
        Ok(())
    } else {
        send_status(client_id, correlation_id, "noRightsError").await;
        return Err(());
    }
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

fn log(client_name: &str, action: &str, id: &str, to_server: bool) {
    use colored::*;

    let colored_action = if to_server {
        action.green()
    } else {
        action.red()
    };

    let truncated_id = &id[..8.min(id.len())];

    println!(
        "{:<15} {:<15} {:<15}",
        truncated_id.yellow(),
        client_name.blue(),
        colored_action,
    );
}
// #endregion

// #region Senders

async fn send_status(client_id: &str, correlation_id: &str, status: &str) {
    let response_payload = OutRespStatusPayload {
        status: status.to_string(),
    };

    let message = BaseMessage::new(response_payload, Some(correlation_id.to_string()));

    send(&client_id, message).await;
}

async fn send(client_id: &str, message: BaseMessage) {
    let response_json = serde_json::to_string(&message).unwrap();
    let connections_lock = CLIENTS_CONNECTIONS.lock().await;

    if let Some(client_write) = connections_lock.get(client_id) {
        let mut write = client_write.lock().await;
        log(
            &get_client(client_id).map_or("???".to_string(), |client| client.name.clone()),
            &message.message_type,
            client_id,
            false,
        );

        if let Err(e) = write.send(Message::text(&response_json)).await {
            eprintln!(
                "Error sending message {} to client {}: {}",
                message.message_type, client_id, e
            );
        }
    } else {
        eprintln!("Client with ID {} not found", client_id);
    }
}

async fn send_and_response<F, Fut>(
    client_id: &str,
    message: BaseMessage,
    pending_responses: Arc<Mutex<PendingResponses>>,
    response_handler: F,
) where
    F: FnOnce(BaseMessage, String, Arc<Mutex<PendingResponses>>) -> Fut + Send + 'static,
    Fut: Future<Output = ()> + Send + 'static,
{
    let correlation_id = message.correlation_id.clone();

    let rx = {
        let mut responses = pending_responses.lock().await;
        responses.insert(correlation_id.clone())
    };

    send(client_id, message).await;

    let client_id_owned = client_id.to_string();
    let pending_responses_cloned = Arc::clone(&pending_responses);

    tokio::spawn(async move {
        match rx.await {
            Ok(response) => {
                response_handler(
                    response,
                    client_id_owned,
                    Arc::clone(&pending_responses_cloned),
                )
                .await;
            }
            Err(e) => {
                eprintln!("Failed to receive response: {}", e);
            }
        }

        let mut responses = pending_responses_cloned.lock().await;
        responses.callbacks.remove(&correlation_id);
    });
}

async fn send_all(message: BaseMessage) {
    let client_list = get_client_list();

    for client in client_list {
        send(&client.id, message.clone()).await;
    }
}
// #endregion

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct BaseMessage {
    pub correlation_id: String,
    pub message_type: String,
    pub payload: Option<serde_json::Value>,
}

#[derive(Deserialize)]
pub struct RegisterClientPayload {
    pub name: String,
}

#[derive(Serialize)]
pub struct ClientRegisteredPayload {
    pub name: String,
}

#[derive(Serialize)]
pub struct StatusPayload {
    pub status: String,
    pub info: Option<String>,
}

#[derive(Serialize)]
pub struct ClientListPayload {
    pub clients: Vec<ClientInfo>,
}

#[derive(Serialize)]
pub struct ClientInfo {
    pub name: String,
}

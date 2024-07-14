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
    pub id: String,
    pub name: String,
}

#[derive(Serialize)]
pub struct ClientDisconnectedPayload {
    pub id: String,
    pub name: String,
}

#[derive(Serialize)]
pub struct StatusPayload {
    pub status: String,
}

#[derive(Serialize)]
pub struct ClientListPayload {
    pub clients: Vec<ClientInfo>,
}

#[derive(Serialize)]
pub struct ClientInfo {
    pub id: String,
    pub name: String,
}

#[derive(Serialize)]
pub struct ChatSentPayload {
	pub id: String,
	pub message: String,
}

#[derive(Deserialize)]
pub struct SendChatPayload {
	pub message: String,
}

#[derive(Deserialize)]
pub struct MakeAdminPayload {
	pub admin_password: String,
	pub client_id: String,
}

#[derive(Serialize)]
pub struct AdminMadePayload {
	pub id: String,
}
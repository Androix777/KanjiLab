use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub trait MessageType {
    const MESSAGE_TYPE: &'static str;
}

macro_rules! impl_message_type {
    ($struct_name:ident, $msg_type:expr) => {
        impl MessageType for $struct_name {
            const MESSAGE_TYPE: &'static str = $msg_type;
        }
    };
}

#[derive(Serialize, Deserialize)]
pub struct BaseMessage {
    pub correlation_id: String,
    pub message_type: String,
    pub payload: Option<serde_json::Value>,
}


impl BaseMessage {
    pub fn new<T: MessageType + Serialize>(payload: T, correlation_id: Option<String>) -> Self {
        let correlation_id = correlation_id.unwrap_or_else(|| Uuid::new_v4().to_string());
        let payload_type = T::MESSAGE_TYPE;
        BaseMessage {
            correlation_id,
            message_type: payload_type.to_string(),
            payload: Some(serde_json::to_value(&payload).unwrap()),
        }
    }
}

#[derive(Deserialize)]
pub struct RegisterClientPayload {
    pub name: String,
}
impl_message_type!(RegisterClientPayload, "registerClient");

#[derive(Serialize)]
pub struct ClientRegisteredPayload {
    pub id: String,
    pub name: String,
}
impl_message_type!(ClientRegisteredPayload, "clientRegistered");

#[derive(Serialize)]
pub struct ClientDisconnectedPayload {
    pub id: String,
    pub name: String,
}
impl_message_type!(ClientDisconnectedPayload, "clientDisconnected");

#[derive(Serialize)]
pub struct StatusPayload {
    pub status: String,
}
impl_message_type!(StatusPayload, "status");

#[derive(Serialize)]
pub struct ClientListPayload {
    pub clients: Vec<ClientInfo>,
}
impl_message_type!(ClientListPayload, "clientList");

#[derive(Serialize)]
pub struct ChatSentPayload {
    pub id: String,
    pub message: String,
}
impl_message_type!(ChatSentPayload, "chatSent");

#[derive(Deserialize)]
pub struct SendChatPayload {
    pub message: String,
}
impl_message_type!(SendChatPayload, "sendChat");

#[derive(Deserialize)]
pub struct MakeAdminPayload {
    pub admin_password: String,
    pub client_id: String,
}
impl_message_type!(MakeAdminPayload, "makeAdmin");

#[derive(Serialize)]
pub struct AdminMadePayload {
    pub id: String,
}
impl_message_type!(AdminMadePayload, "adminMade");

#[derive(Serialize)]
pub struct ClientInfo {
    pub id: String,
    pub name: String,
}

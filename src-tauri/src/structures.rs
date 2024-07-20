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

// IN REQ
#[derive(Deserialize)]
pub struct InReqRegisterClientPayload {
    pub name: String,
}
impl_message_type!(InReqRegisterClientPayload, "IN_REQ_registerClient");

#[derive(Deserialize)]
pub struct InReqSendChatPayload {
    pub message: String,
}
impl_message_type!(InReqSendChatPayload, "IN_REQ_sendChat");

#[derive(Deserialize)]
pub struct InReqMakeAdminPayload {
    pub admin_password: String,
    pub client_id: String,
}
impl_message_type!(InReqMakeAdminPayload, "IN_REQ_makeAdmin");

// OUT RESP
#[derive(Serialize)]
pub struct OutRespClientRegisteredPayload {
    pub id: String,
}
impl_message_type!(OutRespClientRegisteredPayload, "OUT_RESP_clientRegistered");

#[derive(Serialize)]
pub struct OutRespStatusPayload {
    pub status: String,
}
impl_message_type!(OutRespStatusPayload, "OUT_RESP_status");

#[derive(Serialize)]
pub struct OutRespClientListPayload {
    pub clients: Vec<ClientInfo>,
}
impl_message_type!(OutRespClientListPayload, "OUT_RESP_clientList");

// OUT NOTIF
#[derive(Serialize)]
pub struct OutNotifClientRegisteredPayload {
    pub id: String,
    pub name: String,
}
impl_message_type!(OutNotifClientRegisteredPayload, "OUT_NOTIF_clientRegistered");

#[derive(Serialize)]
pub struct OutNotifClientDisconnectedPayload {
    pub id: String,
    pub name: String,
}
impl_message_type!(OutNotifClientDisconnectedPayload, "OUT_NOTIF_clientDisconnected");

#[derive(Serialize)]
pub struct OutNotifChatSentPayload {
    pub id: String,
    pub message: String,
}
impl_message_type!(OutNotifChatSentPayload, "OUT_NOTIF_chatSent");

#[derive(Serialize)]
pub struct OutNotifAdminMadePayload {
    pub id: String,
}
impl_message_type!(OutNotifAdminMadePayload, "OUT_NOTIF_adminMade");

#[derive(Serialize)]
pub struct ClientInfo {
    pub id: String,
    pub name: String,
	pub is_admin: bool,
}

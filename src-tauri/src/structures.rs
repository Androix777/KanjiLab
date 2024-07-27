use kanjilab_macros::MessageType;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub trait MessageType {
    const MESSAGE_TYPE: &'static str;
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
#[derive(Serialize, Deserialize, MessageType)]
#[message_type("IN_REQ_registerClient")]
pub struct InReqRegisterClientPayload {
    pub name: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[message_type("IN_REQ_sendChat")]
pub struct InReqSendChatPayload {
    pub message: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[message_type("IN_REQ_makeAdmin")]
pub struct InReqMakeAdminPayload {
    pub admin_password: String,
    pub client_id: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[message_type("IN_REQ_clientList")]
pub struct InReqClientListPayload { }

#[derive(Serialize, Deserialize, MessageType)]
#[message_type("IN_REQ_startGame")]
pub struct InReqStartGamePayload { }

#[derive(Serialize, Deserialize, MessageType)]
#[message_type("IN_REQ_sendAnswer")]
pub struct InReqSendAnswerPayload { 
	pub answer: String,
}

// OUT RESP
#[derive(Serialize, Deserialize, MessageType)]
#[message_type("OUT_RESP_clientRegistered")]
pub struct OutRespClientRegisteredPayload {
    pub id: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[message_type("OUT_RESP_status")]
pub struct OutRespStatusPayload {
    pub status: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[message_type("OUT_RESP_clientList")]
pub struct OutRespClientListPayload {
    pub clients: Vec<ClientInfo>,
}

#[derive(Serialize, Deserialize, MessageType)]
#[message_type("OUT_RESP_answerResult")]
pub struct OutRespAnswerResultPayload { 
	pub is_correct: bool,
	pub correct_answer: String,
}

// OUT REQ

#[derive(Serialize, Deserialize, MessageType)]
#[message_type("OUT_REQ_question")]
pub struct OutReqQuestionPayload { }

// IN RESP

#[derive(Serialize, Deserialize, MessageType)]
#[message_type("IN_RESP_question")]
pub struct InRespQuestionPayload { 
	pub question: String,
	pub answers: Vec<String>,
}

// OUT NOTIF
#[derive(Serialize, Deserialize, MessageType)]
#[message_type("OUT_NOTIF_clientRegistered")]
pub struct OutNotifClientRegisteredPayload {
    pub id: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[message_type("OUT_NOTIF_clientDisconnected")]
pub struct OutNotifClientDisconnectedPayload {
    pub id: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[message_type("OUT_NOTIF_chatSent")]
pub struct OutNotifChatSentPayload {
    pub id: String,
    pub message: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[message_type("OUT_NOTIF_adminMade")]
pub struct OutNotifAdminMadePayload {
    pub id: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[message_type("OUT_NOTIF_gameStarted")]
pub struct OutNotifGameStartedPayload { }

#[derive(Serialize, Deserialize, MessageType)]
#[message_type("OUT_NOTIF_question")]
pub struct OutNotifQuestionPayload { 
	pub question: String,
	pub answers: Vec<String>,
}

#[derive(Serialize, Deserialize, MessageType)]
#[message_type("OUT_RESP_clientAnswered")]
pub struct OutNotifClientAnsweredPayload { 
	pub is_correct: bool,
}



#[derive(Serialize, Deserialize, PartialEq)]
pub struct ClientInfo {
    pub id: String,
    pub name: String,
    pub is_admin: bool,
}

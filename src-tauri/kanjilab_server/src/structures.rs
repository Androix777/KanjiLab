use kanjilab_macros::MessageType;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub trait MessageType {
    const MESSAGE_TYPE: &'static str;
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
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

// #region IN_REQ

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("IN_REQ_registerClient")]
pub struct InReqRegisterClientPayload {
    pub name: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("IN_REQ_sendChat")]
pub struct InReqSendChatPayload {
    pub message: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("IN_REQ_makeAdmin")]
pub struct InReqMakeAdminPayload {
    pub admin_password: String,
    pub client_id: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("IN_REQ_clientList")]
pub struct InReqClientListPayload {}

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("IN_REQ_startGame")]
pub struct InReqStartGamePayload {
    pub game_settings: GameSettings,
}

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("IN_REQ_stopGame")]
pub struct InReqStopGamePayload {}

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("IN_REQ_sendAnswer")]
pub struct InReqSendAnswerPayload {
    pub answer: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("IN_REQ_sendGameSettings")]
pub struct InReqSendGameSettingsPayload {
    pub game_settings: GameSettings,
}
// #endregion

// #region OUT_RESP

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("OUT_RESP_clientRegistered")]
pub struct OutRespClientRegisteredPayload {
    pub id: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("OUT_RESP_status")]
pub struct OutRespStatusPayload {
    pub status: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("OUT_RESP_clientList")]
pub struct OutRespClientListPayload {
    pub clients: Vec<ClientInfo>,
}
// #endregion

// #region OUT_REQ

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("OUT_REQ_question")]
pub struct OutReqQuestionPayload {}
// #endregion

// #region IN_RESP

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("IN_RESP_question")]
pub struct InRespQuestionPayload {
    pub question: QuestionInfo,
    pub question_svg: String,
}
// #endregion

// #region OUT_NOTIF

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("OUT_NOTIF_clientRegistered")]
pub struct OutNotifClientRegisteredPayload {
    pub id: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("OUT_NOTIF_clientDisconnected")]
pub struct OutNotifClientDisconnectedPayload {
    pub id: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("OUT_NOTIF_chatSent")]
pub struct OutNotifChatSentPayload {
    pub id: String,
    pub message: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("OUT_NOTIF_adminMade")]
pub struct OutNotifAdminMadePayload {
    pub id: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("OUT_NOTIF_gameStarted")]
pub struct OutNotifGameStartedPayload {
    pub game_settings: GameSettings,
}

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("OUT_NOTIF_gameStopped")]
pub struct OutNotifGameStoppedPayload {}

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("OUT_NOTIF_question")]
pub struct OutNotifQuestionPayload {
    pub question_svg: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("OUT_NOTIF_clientAnswered")]
pub struct OutNotifClientAnsweredPayload {
    pub id: String,
}

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("OUT_NOTIF_roundEnded")]
pub struct OutNotifRoundEndedPayload {
    pub question: QuestionInfo,
    pub answers: Vec<AnswerInfo>,
}

#[derive(Serialize, Deserialize, MessageType)]
#[serde(rename_all = "camelCase")]
#[message_type("OUT_NOTIF_gameSettingsChanged")]
pub struct OutNotifGameSettingsChangedPayload {
    pub game_settings: GameSettings,
}

// #endregion

#[derive(Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ClientInfo {
    pub id: String,
    pub name: String,
    pub is_admin: bool,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuestionInfo {
    pub question: String,
    pub answers: Vec<String>,
    pub font_name: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AnswerInfo {
    pub id: String,
    pub answer: String,
    pub is_correct: bool,
}

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct GameSettings {
    pub min_frequency: u64,
    pub max_frequency: u64,
    pub round_duration: u64,
    pub rounds_count: u64,
    pub word_part: Option<String>,
    pub fonts_count: u64,
    pub first_font_name: Option<String>,
}

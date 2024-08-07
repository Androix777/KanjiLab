use std::collections::{hash_map::Entry, HashMap};
use std::sync::{LazyLock, RwLock};
use std::time::Duration;
use tokio::sync::{broadcast, oneshot};
use tokio::time::sleep;
use uuid::Uuid;

use crate::structures::{AnswerInfo, QuestionInfo};

// #region StructuresEnumerations
#[derive(Clone)]
pub struct Client {
    pub id: String,
    pub name: String,
    pub is_admin: bool,
}

#[derive(PartialEq, Clone, Debug)]
pub enum GameState {
    Lobby,
    GameStarting,
    WaitingQuestion,
    AnswerQuestion,
    WatchingQuestion,
}
// #endregion

// #region Static
static CLIENT_LIST: LazyLock<RwLock<HashMap<String, Client>>> = LazyLock::new(Default::default);
static ADMIN_PASSWORD: LazyLock<RwLock<String>> =
    LazyLock::new(|| RwLock::new(Uuid::new_v4().to_string()));
static GAME_STATE: LazyLock<RwLock<GameState>> = LazyLock::new(|| RwLock::new(GameState::Lobby));
static GAME_STATE_NOTIFIER: LazyLock<broadcast::Sender<GameState>> = LazyLock::new(|| {
    let (sender, _) = broadcast::channel(1);
    sender
});
static CURRENT_ROUND_INDEX: LazyLock<RwLock<u64>> = LazyLock::new(|| RwLock::new(0));
static ROUNDS_COUNT: LazyLock<RwLock<u64>> = LazyLock::new(|| RwLock::new(0));
static END_GAME_MARKER: LazyLock<RwLock<bool>> = LazyLock::new(|| RwLock::new(false));
static ANSWERS_BY_ROUND: LazyLock<
    RwLock<HashMap<u64, (QuestionInfo, HashMap<String, AnswerInfo>)>>,
> = LazyLock::new(Default::default);
static ROUND_TIMER_CANCEL: LazyLock<RwLock<Option<oneshot::Sender<()>>>> =
    LazyLock::new(|| RwLock::new(None));
static ROUND_DURATION: LazyLock<RwLock<Duration>> =
    LazyLock::new(|| RwLock::new(Duration::from_secs(600)));
// #endregion

// #region Initialization

pub fn initialize() {
    *ADMIN_PASSWORD.write().unwrap() = Uuid::new_v4().to_string();
    *GAME_STATE.write().unwrap() = GameState::Lobby;
    CLIENT_LIST.write().unwrap().clear();
    *CURRENT_ROUND_INDEX.write().unwrap() = 0;
    ANSWERS_BY_ROUND.write().unwrap().clear();
}

pub fn set_game_state(new_state: GameState) {
    let mut game_state = GAME_STATE.write().unwrap();
    *game_state = new_state.clone();
    let _ = GAME_STATE_NOTIFIER.send(new_state);
}

pub fn get_game_state() -> GameState {
    GAME_STATE.read().unwrap().clone()
}
// #endregion

// #region ClientsManagement

pub fn add_client(id: &str, name: &str) -> bool {
    match CLIENT_LIST.write().unwrap().entry(id.to_string()) {
        Entry::Vacant(entry) => {
            entry.insert(Client {
                id: id.to_string(),
                name: name.to_string(),
                is_admin: false,
            });
            true
        }
        Entry::Occupied(_) => false,
    }
}

pub fn make_admin(id: &str) -> bool {
    CLIENT_LIST
        .write()
        .unwrap()
        .get_mut(id)
        .map(|client| {
            client.is_admin = true;
            true
        })
        .unwrap_or(false)
}

pub fn remove_client(client_id: &str) {
    CLIENT_LIST.write().unwrap().remove(client_id);
}

pub fn get_client_list() -> Vec<Client> {
    CLIENT_LIST.read().unwrap().values().cloned().collect()
}

pub fn get_client(client_id: &str) -> Option<Client> {
    CLIENT_LIST.read().unwrap().get(client_id).cloned()
}

pub fn get_admin_id() -> Option<String> {
    CLIENT_LIST
        .read()
        .unwrap()
        .values()
        .find(|client| client.is_admin)
        .map(|admin| admin.id.clone())
}
// #endregion

// #region GameControl

pub fn get_admin_password() -> String {
    ADMIN_PASSWORD.read().unwrap().clone()
}

pub fn start_game(round_duration: Duration, rounds_count: u64) -> bool {
    *ROUNDS_COUNT.write().unwrap() = rounds_count;
    *ROUND_DURATION.write().unwrap() = round_duration;
    let current_state = get_game_state();
    if current_state == GameState::Lobby {
        *CURRENT_ROUND_INDEX.write().unwrap() = 0;
        ANSWERS_BY_ROUND.write().unwrap().clear();
        set_game_state(GameState::GameStarting);
        true
    } else {
        false
    }
}

pub fn stop_game() -> bool {
    let current_state = get_game_state();
    if current_state != GameState::Lobby {
        *END_GAME_MARKER.write().unwrap() = true;
        if let Some(cancel_sender) = ROUND_TIMER_CANCEL.write().unwrap().take() {
            let _ = cancel_sender.send(());
        }
        true
    } else {
        false
    }
}

pub fn set_current_question(question: QuestionInfo) {
    let mut marker = END_GAME_MARKER.write().unwrap();
    if *marker {
        *marker = false;
        set_game_state(GameState::Lobby);
    }

    let current_round = *CURRENT_ROUND_INDEX.write().unwrap();
    ANSWERS_BY_ROUND
        .write()
        .unwrap()
        .insert(current_round, (question, HashMap::new()));

    set_game_state(GameState::AnswerQuestion);

    let (cancel_sender, cancel_receiver) = oneshot::channel();
    *ROUND_TIMER_CANCEL.write().unwrap() = Some(cancel_sender);
    let duration = ROUND_DURATION.read().unwrap().clone();

    tokio::spawn(async move {
        tokio::select! {
            _ = sleep(duration) => {},
            _ = cancel_receiver => {}
        }
        let game_state = {
            let mut marker = END_GAME_MARKER.write().unwrap();
            if *marker {
                *marker = false;
                GameState::Lobby
            } else {
                let mut index = CURRENT_ROUND_INDEX.write().unwrap();
                if (*index + 1) >= *ROUNDS_COUNT.read().unwrap() {
                    GameState::Lobby
                } else {
                    *index += 1;
                    GameState::WaitingQuestion
                }
            }
        };
        set_game_state(game_state);
    });
}

pub fn subscribe_to_game_state() -> broadcast::Receiver<GameState> {
    GAME_STATE_NOTIFIER.subscribe()
}

pub enum AnswerError {
    NoCurrentQuestion,
    AlreadyAnswered,
}

pub fn record_answer(client_id: &str, answer: &str) -> Result<bool, AnswerError> {
    let current_round = *CURRENT_ROUND_INDEX.read().unwrap();
    let mut answers_by_round = ANSWERS_BY_ROUND.write().unwrap();

    let (question, answers) = answers_by_round
        .get_mut(&current_round)
        .ok_or(AnswerError::NoCurrentQuestion)?;

    if answers.contains_key(client_id) {
        return Err(AnswerError::AlreadyAnswered);
    }

    let is_correct = question
        .answers
        .iter()
        .any(|correct_answer| correct_answer.to_lowercase() == answer.to_lowercase());

    let answer_info = AnswerInfo {
        id: client_id.to_string(),
        answer: answer.to_string(),
        is_correct,
    };

    answers.insert(client_id.to_string(), answer_info.clone());

    Ok(is_correct)
}

pub fn get_all_answers() -> HashMap<u64, (QuestionInfo, HashMap<String, AnswerInfo>)> {
    ANSWERS_BY_ROUND.read().unwrap().clone()
}

pub fn get_question_for_round(round_index: u64) -> Option<QuestionInfo> {
    ANSWERS_BY_ROUND
        .read()
        .unwrap()
        .get(&round_index)
        .map(|(question, _)| question.clone())
}

pub fn get_answers_for_round(round_index: u64) -> Vec<AnswerInfo> {
    ANSWERS_BY_ROUND
        .read()
        .unwrap()
        .get(&round_index)
        .map(|(_, answers)| answers.values().cloned().collect())
        .unwrap_or_else(Vec::new)
}

pub fn get_current_round() -> u64 {
    *CURRENT_ROUND_INDEX.read().unwrap()
}

pub fn get_round_duration() -> u64 {
    ROUND_DURATION.read().unwrap().as_secs()
}

pub fn get_rounds_count() -> u64 {
    *ROUNDS_COUNT.read().unwrap()
}

pub fn all_clients_answered() -> bool {
    let current_round = *CURRENT_ROUND_INDEX.read().unwrap();
    let answers_by_round = ANSWERS_BY_ROUND.read().unwrap();
    let client_list = CLIENT_LIST.read().unwrap();

    if let Some((_, answers)) = answers_by_round.get(&current_round) {
        client_list.len() == answers.len()
    } else {
        false
    }
}

pub fn end_round_early() -> bool {
    let current_state = get_game_state();
    if current_state == GameState::AnswerQuestion {
        if let Some(cancel_sender) = ROUND_TIMER_CANCEL.write().unwrap().take() {
            let _ = cancel_sender.send(());
        }
        true
    } else {
        false
    }
}
// #endregion

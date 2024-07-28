use std::collections::hash_map::Entry;
use std::collections::HashMap;
use std::sync::LazyLock;
use std::sync::RwLock;
use std::time::Duration;
use uuid::Uuid;
use tokio::time::sleep;
use tokio::sync::broadcast;

#[derive(Clone)]
pub struct Client {
    pub id: String,
    pub name: String,
    pub is_admin: bool,
}

#[derive(Clone)]
pub struct Question {
    pub question: String,
	pub answers: Vec<String>,
}

#[derive(PartialEq, Clone, Debug)]
pub enum GameState {
	Lobby,
	GameStarting,
	WaitingQuestion,
	AnswerQuestion,
	WatchingQuestion,
}

static CLIENT_LIST: LazyLock<RwLock<HashMap<String, Client>>> = LazyLock::new(Default::default);

static ADMIN_PASSWORD: LazyLock<RwLock<String>> =
    LazyLock::new(|| RwLock::new(Uuid::new_v4().to_string()));

static GAME_STATE: LazyLock<RwLock<GameState>> = LazyLock::new(|| RwLock::new(GameState::Lobby));

static CURRENT_QUESTION: LazyLock<RwLock<Option<Question>>> = LazyLock::new(|| RwLock::new(None));

const ROUND_DURATION: Duration = Duration::from_secs(5);

static GAME_STATE_NOTIFIER: LazyLock<broadcast::Sender<GameState>> = LazyLock::new(|| {
    let (sender, _) = broadcast::channel(1);
    sender
});

pub fn initialize() {
    let mut password_lock = ADMIN_PASSWORD.write().unwrap();
    *password_lock = Uuid::new_v4().to_string();
	*GAME_STATE.write().unwrap() = GameState::Lobby;

    CLIENT_LIST.write().unwrap().clear();
}

pub fn set_game_state(new_state: GameState) {
    let mut game_state = GAME_STATE.write().unwrap();
    *game_state = new_state.clone();
    let _ = GAME_STATE_NOTIFIER.send(new_state);
}

pub fn client_exists(id: &str) -> bool {
    CLIENT_LIST.read().unwrap().contains_key(id)
}

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
    if let Some(client) = CLIENT_LIST.write().unwrap().get_mut(id) {
        client.is_admin = true;
        true
    } else {
        false
    }
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

pub fn get_admin_password() -> String {
    ADMIN_PASSWORD.read().unwrap().clone()
}

pub fn start_game() -> bool {
    let current_state = {
        let game_state = GAME_STATE.read().unwrap();
        game_state.clone()
    };

    if current_state == GameState::Lobby {
        set_game_state(GameState::GameStarting);
        true
    } else {
        false
    }
}

pub fn stop_game() -> bool {
    let current_state = {
        let game_state = GAME_STATE.read().unwrap();
        game_state.clone()
    };

    if current_state != GameState::Lobby {
        set_game_state(GameState::Lobby);
        true
    } else {
        false
    }
}

pub fn get_game_state() -> GameState {
    GAME_STATE.read().unwrap().clone()
}

pub fn set_current_question(question: String, answers: Vec<String>) {
    let mut current_question = CURRENT_QUESTION.write().unwrap();
    *current_question = Some(Question { question, answers });
    
    set_game_state(GameState::AnswerQuestion);
    
    tokio::spawn(async move {
        sleep(ROUND_DURATION).await;
		let mut current_question = CURRENT_QUESTION.write().unwrap();
    	*current_question = None;
        set_game_state(GameState::WaitingQuestion);
    });
}

pub fn get_current_question() -> Option<Question> {
    CURRENT_QUESTION.read().unwrap().clone()
}

pub fn subscribe_to_game_state() -> broadcast::Receiver<GameState> {
    GAME_STATE_NOTIFIER.subscribe()
}

pub fn get_admin_id() -> Option<String> {
    CLIENT_LIST.read().unwrap()
        .values()
        .find(|client| client.is_admin)
        .map(|admin| admin.id.clone())
}

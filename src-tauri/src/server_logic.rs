use std::collections::HashMap;
use std::sync::LazyLock;
use std::sync::Mutex;
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct Client {
    pub id: String,
    pub name: String,
    pub is_admin: bool,
}

pub type ClientList = Mutex<HashMap<String, Client>>;

pub static CLIENT_LIST: LazyLock<ClientList> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

pub static ADMIN_PASSWORD: LazyLock<Mutex<String>> =
    LazyLock::new(|| Mutex::new(Uuid::new_v4().to_string()));

pub fn initialize() {
    let mut password_lock = ADMIN_PASSWORD.lock().unwrap();
    *password_lock = Uuid::new_v4().to_string();

    CLIENT_LIST.lock().unwrap().clear();
}

pub fn client_exists(id: &str) -> bool {
    CLIENT_LIST.lock().unwrap().contains_key(id)
}

pub fn add_client(id: &str, name: &str) -> bool {
    if client_exists(id) {
        return false;
    }

    let client = Client {
        id: id.to_string(),
        name: name.to_string(),
        is_admin: false,
    };

    CLIENT_LIST.lock().unwrap().insert(id.to_string(), client);
    true
}

pub fn make_admin(id: &str) -> bool {
    let mut clients_lock = CLIENT_LIST.lock().unwrap();
    if let Some(client) = clients_lock.get_mut(id) {
        client.is_admin = true;
        true
    } else {
        false
    }
}

pub fn remove_client(client_id: &str) {
    CLIENT_LIST.lock().unwrap().remove(client_id);
}

pub fn get_client_list() -> Vec<Client> {
    CLIENT_LIST.lock().unwrap().values().cloned().collect()
}

pub fn get_client(client_id: &str) -> Option<Client> {
    CLIENT_LIST.lock().unwrap().get(client_id).cloned()
}

pub fn get_admin_password() -> String {
    ADMIN_PASSWORD.lock().unwrap().clone()
}

use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};

use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct Client {
    pub id: String,
    pub name: String,
	pub is_admin: bool,
}

pub type ClientList = Arc<Mutex<HashMap<String, Client>>>;

pub static CLIENT_LIST: OnceLock<ClientList> = OnceLock::new();
pub static ADMIN_PASSWORD: OnceLock<Arc<Mutex<String>>> = OnceLock::new();

pub fn initialize() {
	if let Some(password) = ADMIN_PASSWORD.get() {
        let mut password_lock = password.lock().unwrap();
        *password_lock = Uuid::new_v4().to_string();
    } else {
        ADMIN_PASSWORD.set(Arc::new(Mutex::new(Uuid::new_v4().to_string()))).unwrap();
    }
	
    if CLIENT_LIST.get().is_none() {
        CLIENT_LIST.set(Arc::new(Mutex::new(HashMap::new()))).unwrap();
    } else {
        let clients = CLIENT_LIST.get().unwrap();
        clients.lock().unwrap().clear();
    }
}

pub fn client_exists(id: &str) -> bool {
    let clients = CLIENT_LIST.get().unwrap();
    let clients_lock = clients.lock().unwrap();
    clients_lock.contains_key(id)
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

    let clients = CLIENT_LIST.get().unwrap();
    clients.lock().unwrap().insert(id.to_string(), client);
    true
}

pub fn make_admin(id: &str) -> bool {
    let clients = CLIENT_LIST.get().unwrap();
    let mut clients_lock = clients.lock().unwrap();
    if let Some(client) = clients_lock.get_mut(id) {
        client.is_admin = true;
		return true;
    }
	else {
		return false;
	}
}

pub fn remove_client(client_id: &str) {
    let clients = CLIENT_LIST.get().unwrap();
    clients.lock().unwrap().remove(client_id);
}

pub fn get_client_list() -> Vec<Client> {
    let clients = CLIENT_LIST.get().unwrap();
    let clients_lock = clients.lock().unwrap();
    clients_lock.values().cloned().collect()
}

pub fn get_client(client_id: &str) -> Option<Client> {
    let client_list = get_client_list();
    for client in client_list {
        if client.id == client_id {
            return Some(client.clone());
        }
    }
    None
}

pub fn get_admin_password() -> String {
    ADMIN_PASSWORD.get().unwrap().lock().unwrap().clone()
}
// src/server_logic.rs

use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};

#[derive(Clone, Debug)]
pub struct Client {
    pub id: String,
    pub name: String,
}

pub type ClientList = Arc<Mutex<HashMap<String, Client>>>;

pub static CLIENT_LIST: OnceLock<ClientList> = OnceLock::new();

pub fn initialize() {
    CLIENT_LIST.set(Arc::new(Mutex::new(HashMap::new()))).unwrap();
}

pub fn add_client(clients: &ClientList, name: String) -> String {
    let client_id = uuid::Uuid::new_v4().to_string();
    let client = Client {
        id: client_id.clone(),
        name: name.clone(),
    };

    clients.lock().unwrap().insert(client_id.clone(), client);
    client_id
}

pub fn remove_client(clients: &ClientList, client_id: &String) {
    clients.lock().unwrap().remove(client_id);
}

pub fn get_client_list(clients: &ClientList) -> Vec<Client> {
    let clients_lock = clients.lock().unwrap();
    clients_lock.values().cloned().collect()
}

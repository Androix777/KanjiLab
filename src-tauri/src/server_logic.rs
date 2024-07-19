use std::collections::hash_map::Entry;
use std::collections::HashMap;
use std::sync::LazyLock;
use std::sync::RwLock;
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct Client {
    pub id: String,
    pub name: String,
    pub is_admin: bool,
}

pub static CLIENT_LIST: LazyLock<RwLock<HashMap<String, Client>>> = LazyLock::new(Default::default);

pub static ADMIN_PASSWORD: LazyLock<RwLock<String>> =
    LazyLock::new(|| RwLock::new(Uuid::new_v4().to_string()));

pub fn initialize() {
    let mut password_lock = ADMIN_PASSWORD.write().unwrap();
    *password_lock = Uuid::new_v4().to_string();

    CLIENT_LIST.write().unwrap().clear();
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

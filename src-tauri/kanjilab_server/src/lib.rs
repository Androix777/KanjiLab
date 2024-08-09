pub mod server;
pub mod structures;
pub mod server_logic;

pub async fn call_launch_server() {
    server::call_launch_server().await;
}

pub async fn call_stop_server() {
    server::call_stop_server().await;
}

pub fn get_admin_password() -> String {
    server_logic::get_admin_password()
}
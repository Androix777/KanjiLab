pub mod server;
pub mod server_logic;
pub mod structures;
pub mod tools;

pub async fn call_launch_server(host_port: String) {
    server::call_launch_server(host_port).await;
}

pub async fn call_stop_server() {
    server::call_stop_server().await;
}

pub fn get_admin_password() -> String {
    server_logic::get_admin_password()
}

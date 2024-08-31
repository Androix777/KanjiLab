pub mod server;
pub mod server_logic;
pub mod structures;
pub mod tools;

#[tokio::main]
async fn main() {
    *server::IS_AUTO_SERVER.lock().await = true;
    server::call_launch_server().await;

    tokio::signal::ctrl_c()
        .await
        .expect("Failed to listen for ctrl_c signal");

    println!("Server stopped");
}

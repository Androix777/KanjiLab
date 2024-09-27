use base64::prelude::*;
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use serde_json;
use std::fs::{read, File};
use std::io::Write;
use std::path::PathBuf;

use crate::tools::get_executable_file_path;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AccountInfo {
    name: String,
    public_key: String,
    private_key: String,
}

#[derive(Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct Accounts {
    accounts: Vec<AccountInfo>,
}

fn get_key_file_path() -> Result<PathBuf, String> {
    let mut file_path = get_executable_file_path()?;
    file_path.push("keys.json");
    Ok(file_path)
}

fn load_accounts() -> Result<Accounts, String> {
    let file_path = get_key_file_path()?;
    if !file_path.exists() {
        return Ok(Accounts::default());
    }

    let content = read(&file_path).map_err(|e| format!("Failed to read file: {}", e))?;
    let accounts = serde_json::from_slice(&content)
        .map_err(|e| format!("Failed to deserialize accounts: {}", e))?;
    Ok(accounts)
}

fn save_accounts(accounts: &Accounts) -> Result<(), String> {
    let file_path = get_key_file_path()?;
    let serialized = serde_json::to_string_pretty(accounts)
        .map_err(|e| format!("Failed to serialize accounts: {}", e))?;

    let mut file = File::create(&file_path).map_err(|e| format!("Failed to create file: {}", e))?;
    file.write_all(serialized.as_bytes())
        .map_err(|e| format!("Failed to write to file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn create_account(name: &str) -> Result<AccountInfo, String> {
    let mut accounts = load_accounts()?;

    let mut csprng = OsRng;
    let signing_key = SigningKey::generate(&mut csprng);
    let verifying_key = signing_key.verifying_key();

    let key_pair = AccountInfo {
        name: name.to_string(),
        public_key: BASE64_STANDARD.encode(verifying_key.to_bytes()),
        private_key: BASE64_STANDARD.encode(signing_key.to_bytes()),
    };

    accounts.accounts.push(key_pair.clone());
    save_accounts(&accounts)?;

    Ok(key_pair)
}

#[tauri::command]
pub fn remove_account(public_key: &str) -> Result<(), String> {
    let mut accounts = load_accounts()?;

    if let Some(pos) = accounts
        .accounts
        .iter()
        .position(|acc| acc.public_key == public_key)
    {
        accounts.accounts.remove(pos);
        save_accounts(&accounts)?;
        Ok(())
    } else {
        Err("Public key not found".to_string())
    }
}

#[tauri::command]
pub fn rename_account(public_key: &str, new_name: &str) -> Result<(), String> {
    let mut accounts = load_accounts()?;

    if let Some(account) = accounts
        .accounts
        .iter_mut()
        .find(|acc| acc.public_key == public_key)
    {
        account.name = new_name.to_string();
        save_accounts(&accounts)?;
        Ok(())
    } else {
        Err("Account with the provided public key not found".to_string())
    }
}

#[tauri::command]
pub fn get_accounts() -> Result<Vec<AccountInfo>, String> {
    let accounts = load_accounts()?;
    Ok(accounts.accounts)
}

#[tauri::command]
pub fn sign_message(public_key: &str, message: &str) -> Result<String, String> {
    let accounts = load_accounts()?;

    let key_pair = accounts
        .accounts
        .iter()
        .find(|acc| acc.public_key == public_key)
        .ok_or("Account with the provided public key not found")?;

    let signing_key_bytes = BASE64_STANDARD
        .decode(&key_pair.private_key)
        .map_err(|e| format!("Invalid signing key: {}", e))?;
    let signing_key = SigningKey::from_bytes(
        &signing_key_bytes
            .try_into()
            .map_err(|_| "Invalid signing key length")?,
    );

    let signature = signing_key.sign(message.as_bytes());
    Ok(BASE64_STANDARD.encode(signature.to_bytes()))
}

#[tauri::command]
pub fn verify_signature(public_key: &str, message: &str, signature: &str) -> Result<bool, String> {
    let public_key_bytes = BASE64_STANDARD
        .decode(public_key)
        .map_err(|e| format!("Invalid public key: {}", e))?;
    let verifying_key = VerifyingKey::from_bytes(
        &public_key_bytes
            .try_into()
            .map_err(|_| "Invalid public key length")?,
    )
    .map_err(|e| format!("Invalid public key: {}", e))?;

    let signature_bytes = BASE64_STANDARD
        .decode(signature)
        .map_err(|e| format!("Invalid signature: {}", e))?;

    let signature = Signature::from_bytes(
        &signature_bytes
            .try_into()
            .map_err(|_| "Invalid signature length")?,
    );

    Ok(verifying_key.verify(message.as_bytes(), &signature).is_ok())
}

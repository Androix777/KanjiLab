use base64::prelude::*;
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use serde_json;
use std::fs::{read, File};
use std::io::Write;
use std::path::PathBuf;

use crate::get_executable_file_path;

#[derive(Serialize, Deserialize)]
struct KeyPair {
    signing_key: SigningKey,
    verifying_key: VerifyingKey,
}

fn get_key_file_path() -> Result<PathBuf, String> {
    let mut file_path = get_executable_file_path()?;
    file_path.push("keys.json");
    Ok(file_path)
}

fn generate_keys() -> Result<(), String> {
    let file_path = get_key_file_path()?;

    if file_path.exists() {
        return Ok(());
    }

    let mut csprng = OsRng;
    let signing_key = SigningKey::generate(&mut csprng);
    let verifying_key = signing_key.verifying_key();

    let key_pair = KeyPair {
        signing_key,
        verifying_key,
    };

    let serialized = serde_json::to_string_pretty(&key_pair)
        .map_err(|e| format!("Failed to serialize key pair: {}", e))?;

    let mut file = File::create(&file_path).map_err(|e| format!("Failed to create file: {}", e))?;

    file.write_all(serialized.as_bytes())
        .map_err(|e| format!("Failed to write to file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn get_public_key() -> Result<String, String> {
    generate_keys().unwrap();

    let file_path = get_key_file_path()?;
    let content = read(&file_path).map_err(|e| format!("Failed to read file: {}", e))?;

    let key_pair: KeyPair = serde_json::from_slice(&content)
        .map_err(|e| format!("Failed to deserialize key pair: {}", e))?;

    Ok(BASE64_STANDARD.encode(key_pair.verifying_key.to_bytes()))
}

#[tauri::command]
pub fn sign_message(message: &str) -> Result<String, String> {
    generate_keys().unwrap();

    let file_path = get_key_file_path()?;
    let content = read(&file_path).map_err(|e| format!("Failed to read file: {}", e))?;

    let key_pair: KeyPair = serde_json::from_slice(&content)
        .map_err(|e| format!("Failed to deserialize key pair: {}", e))?;

    let signature = key_pair.signing_key.sign(message.as_bytes());
    Ok(BASE64_STANDARD.encode(signature.to_bytes()))
}

#[tauri::command]
pub fn verify_signature(message: &str, signature: &str, key: &str) -> Result<bool, String> {
    let public_key_bytes = BASE64_STANDARD
        .decode(key)
        .map_err(|e| format!("Invalid public key: {}", e))?;
    let verifying_key = VerifyingKey::from_bytes(&public_key_bytes.try_into().unwrap())
        .map_err(|e| format!("Invalid public key: {}", e))?;

    let signature_bytes = BASE64_STANDARD
        .decode(signature)
        .map_err(|e| format!("Invalid signature: {}", e))?;
    let signature = Signature::from_bytes(&signature_bytes.try_into().unwrap());

    Ok(verifying_key.verify(message.as_bytes(), &signature).is_ok())
}

use base64::{prelude::BASE64_STANDARD, Engine};
use ed25519_dalek::{Signature, VerifyingKey, Verifier};

pub fn verify_signature(message: &str, signature: &str, key: &str) -> Result<bool, String> {
    let public_key_bytes = BASE64_STANDARD.decode(key)
        .map_err(|e| format!("Invalid public key: {}", e))?;
    let verifying_key = VerifyingKey::from_bytes(&public_key_bytes.try_into().unwrap())
        .map_err(|e| format!("Invalid public key: {}", e))?;

    let signature_bytes = BASE64_STANDARD.decode(signature)
        .map_err(|e| format!("Invalid signature: {}", e))?;
    let signature = Signature::from_bytes(&signature_bytes.try_into().unwrap());

    Ok(verifying_key.verify(message.as_bytes(), &signature).is_ok())
}
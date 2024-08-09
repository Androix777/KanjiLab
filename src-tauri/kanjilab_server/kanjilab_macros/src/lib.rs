use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput, Lit};

#[proc_macro_derive(MessageType, attributes(message_type))]
pub fn derive_message_type(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let name = &input.ident;

    let mut message_type = None;
    for attr in &input.attrs {
        if !attr.path().is_ident("message_type") {
            continue;
        }

        if let Ok(Lit::Str(lit_str)) = attr.parse_args::<Lit>() {
            message_type = Some(lit_str.value());
            break;
        }
    }

    let message_type =
        message_type.expect("message_type attribute is required and must be a string literal");

    let expanded = quote! {
        impl MessageType for #name {
            const MESSAGE_TYPE: &'static str = #message_type;
        }
    };

    TokenStream::from(expanded)
}

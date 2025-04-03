from py_vapid import Vapid
import base64
import json
from cryptography.hazmat.primitives import serialization

def generate_vapid_keys():
    # Generate new VAPID keys
    vapid = Vapid()
    vapid.generate_keys()  # Generate keys first
    
    # Get the keys
    private_key = vapid.private_key
    public_key = vapid.public_key

    # Convert private key to bytes
    private_key_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )

    # Convert public key to bytes
    public_key_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )

    # Convert keys to base64 URL-safe format
    private_key_b64 = base64.urlsafe_b64encode(private_key_bytes).decode('utf-8').rstrip('=')
    public_key_b64 = base64.urlsafe_b64encode(public_key_bytes).decode('utf-8').rstrip('=')

    # Print keys in format yang siap digunakan
    print("\nVAPID Keys generated successfully!")
    print("\nPublic Key:")
    print(public_key_b64)
    print("\nPrivate Key:")
    print(private_key_b64)

    # Save to .env file
    with open('.env', 'a') as f:
        f.write(f'\nVITE_VAPID_PUBLIC_KEY={public_key_b64}')
        f.write(f'\nVITE_VAPID_PRIVATE_KEY={private_key_b64}')
    
    print("\nKeys have been saved to .env file")

if __name__ == "__main__":
    generate_vapid_keys() 
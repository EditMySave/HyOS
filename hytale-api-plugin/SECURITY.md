# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Best Practices

### Before Deployment

1. **Change Default Credentials**: The default configuration contains placeholder values. Generate proper bcrypt hashes before use:
   ```bash
   htpasswd -bnBC 12 "" yourpassword | tr -d ':'
   ```

2. **Enable TLS**: In production, always enable TLS by configuring `tls.enabled: true` with valid certificates.

3. **Restrict Bind Address**: If using a reverse proxy, bind to localhost only:
   ```json
   "bindAddress": "127.0.0.1"
   ```

4. **Minimize Permissions**: Grant only the minimum required permissions to each client.

5. **Protect RSA Keys**: The JWT RSA keypair (`jwt-keypair.pem`) is automatically generated and should be kept secure. Do not commit this file to version control.

### Configuration Files

The following files contain sensitive data and must not be committed to version control:
- `config.json` - Contains client secrets (bcrypt hashes)
- `jwt-keypair.pem` - RSA private key for JWT signing
- `*.pem`, `*.key`, `*.crt` - TLS certificates and keys

These are already included in `.gitignore`.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by:

1. **Do NOT** create a public GitHub issue
2. Contact the maintainers privately
3. Provide a detailed description of the vulnerability
4. Allow reasonable time for a fix before public disclosure

We take security seriously and will respond to reports promptly.

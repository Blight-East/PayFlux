ALTER TABLE processor_connections
ADD COLUMN access_token text,
ADD COLUMN refresh_token text,
ADD COLUMN token_expires_at timestamptz;

COMMENT ON COLUMN processor_connections.access_token IS 'Stripe OAuth access token for making API calls on behalf of the connected account';
COMMENT ON COLUMN processor_connections.refresh_token IS 'Stripe OAuth refresh token for obtaining new access tokens';
COMMENT ON COLUMN processor_connections.token_expires_at IS 'Expiration timestamp for the access token (if applicable)';

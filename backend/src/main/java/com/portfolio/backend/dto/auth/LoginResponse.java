package com.portfolio.backend.dto.auth;

/**
 * What the dashboard gets back after a successful login.
 *
 * <p>{@code expiresInMs} lets the frontend schedule a re-login before the token dies, instead
 * of discovering it mid-request and dumping the photographer back at the login screen while
 * he was halfway through captioning a gallery.
 */
public record LoginResponse(
        String token,
        String tokenType,
        long expiresInMs,
        String username,
        String role
) {
    public static LoginResponse bearer(String token, long expiresInMs, String username, String role) {
        return new LoginResponse(token, "Bearer", expiresInMs, username, role);
    }
}

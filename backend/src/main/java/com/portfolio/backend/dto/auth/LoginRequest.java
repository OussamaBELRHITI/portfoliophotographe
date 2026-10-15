package com.portfolio.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * Incoming login payload.
 *
 * <p>The validation annotations are enforced by {@code @Valid} on the controller method, so a
 * blank username is rejected with a 400 before any service code runs. Validating at the edge
 * keeps the service free of defensive null checks.
 */
public record LoginRequest(
        @NotBlank(message = "Username is required")
        String username,

        @NotBlank(message = "Password is required")
        String password
) {
}

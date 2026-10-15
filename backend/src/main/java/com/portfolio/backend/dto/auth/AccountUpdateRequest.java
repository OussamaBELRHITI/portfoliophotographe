package com.portfolio.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * The signed-in admin changing their own login.
 *
 * <p>The current password is always required, even for a username-only change: a dashboard
 * left open on a shared computer must not be enough to lock the owner out of it.
 *
 * @param newPassword null or blank keeps the existing password
 */
public record AccountUpdateRequest(
        @NotBlank(message = "Enter your current password")
        String currentPassword,

        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 50, message = "Use 3 to 50 characters")
        @Pattern(regexp = "^[A-Za-z0-9._-]+$",
                message = "Use letters, numbers, dots, dashes or underscores — no spaces")
        String username,

        // BCrypt only reads the first 72 bytes, and Spring rejects longer input outright.
        @Size(max = 72, message = "At most 72 characters")
        String newPassword
) {
}

package com.portfolio.backend.service;

import com.portfolio.backend.dto.auth.AccountUpdateRequest;
import com.portfolio.backend.dto.auth.LoginRequest;
import com.portfolio.backend.dto.auth.LoginResponse;
import com.portfolio.backend.entity.AdminUser;
import com.portfolio.backend.exception.DuplicateResourceException;
import com.portfolio.backend.exception.ResourceNotFoundException;
import com.portfolio.backend.repository.AdminUserRepository;
import com.portfolio.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Login logic, kept out of the controller.
 *
 * <p>This is the layering the project brief asked for: the controller's job is HTTP (bind the
 * body, pick a status code), the service's job is the actual behaviour. Keeping them apart
 * means this can be unit-tested without spinning up a web context.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final AdminUserRepository adminUserRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    /** Long enough to resist guessing, short enough that it gets typed rather than avoided. */
    private static final int MIN_PASSWORD_LENGTH = 8;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        try {
            // Delegating to the AuthenticationManager rather than comparing hashes here means
            // the "is this user disabled / locked / expired" rules stay in one place, and we
            // get BCrypt verification for free.
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username(), request.password())
            );
        } catch (AuthenticationException ex) {
            log.warn("Failed login attempt for username '{}'", request.username());
            // Collapsing every failure mode into one generic message: "no such user" and
            // "wrong password" must be indistinguishable from outside.
            throw new BadCredentialsException("Invalid username or password");
        }

        AdminUser admin = adminUserRepository.findByUsername(request.username())
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));

        admin.setLastLoginAt(Instant.now());
        // No explicit save() needed: admin is a managed entity inside a transaction, so JPA
        // flushes the change automatically at commit. This is "dirty checking", and it is one
        // of the bigger conceptual jumps coming from a query-per-write world.

        String token = jwtService.generateToken(admin.getUsername(), admin.getRole().name());
        log.info("Admin '{}' logged in", admin.getUsername());

        return LoginResponse.bearer(
                token,
                jwtService.getExpirationMs(),
                admin.getUsername(),
                admin.getRole().name()
        );
    }

    /**
     * Changes the signed-in admin's username and/or password.
     *
     * <p>Returns a fresh token because the token's subject is the username: after a rename the
     * old token would name an account that no longer exists.
     */
    @Transactional
    public LoginResponse updateAccount(String currentUsername, AccountUpdateRequest request) {
        AdminUser admin = adminUserRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found — please sign in again"));

        if (!passwordEncoder.matches(request.currentPassword(), admin.getPasswordHash())) {
            log.warn("Account update for '{}' rejected: wrong current password", currentUsername);
            throw new IllegalArgumentException("Your current password is incorrect");
        }

        String newUsername = request.username().trim();
        if (!newUsername.equals(admin.getUsername()) && adminUserRepository.existsByUsername(newUsername)) {
            throw new DuplicateResourceException("That username is already taken");
        }

        String newPassword = request.newPassword();
        boolean passwordChanged = newPassword != null && !newPassword.isBlank();
        if (passwordChanged) {
            if (newPassword.length() < MIN_PASSWORD_LENGTH) {
                throw new IllegalArgumentException(
                        "The new password must be at least " + MIN_PASSWORD_LENGTH + " characters");
            }
            admin.setPasswordHash(passwordEncoder.encode(newPassword));
        }
        admin.setUsername(newUsername);

        log.info("Admin '{}' updated their account (username {}, password {})", currentUsername,
                newUsername.equals(currentUsername) ? "unchanged" : "-> '" + newUsername + "'",
                passwordChanged ? "changed" : "unchanged");

        String token = jwtService.generateToken(admin.getUsername(), admin.getRole().name());
        return LoginResponse.bearer(token, jwtService.getExpirationMs(), admin.getUsername(), admin.getRole().name());
    }
}

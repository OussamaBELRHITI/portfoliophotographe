package com.portfolio.backend.config;

import com.portfolio.backend.entity.AdminUser;
import com.portfolio.backend.entity.Role;
import com.portfolio.backend.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the photographer's account on first start.
 *
 * <p>Without this there is a chicken-and-egg problem: every admin endpoint requires a login, but
 * there is no way to create the first user without one.
 *
 * <p>Runs only when the username is absent, so restarts never clobber a changed password.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminUserSeeder implements CommandLineRunner {

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username:admin}")
    private String username;

    @Value("${app.admin.password:changeme}")
    private String password;

    @Value("${app.admin.email:}")
    private String email;

    @Override
    @Transactional
    public void run(String... args) {
        // Any account at all, not "an account with this username": once the photographer
        // renames his login from the dashboard, a by-name check would recreate the default
        // account — with the default password — on the next restart.
        if (adminUserRepository.count() > 0) {
            log.debug("An admin account already exists, skipping seed");
            return;
        }

        AdminUser admin = new AdminUser();
        admin.setUsername(username);
        admin.setEmail(email.isBlank() ? null : email);
        // Hashed here, never stored as typed.
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setRole(Role.ADMIN);
        admin.setEnabled(true);
        adminUserRepository.save(admin);

        log.info("Seeded admin user '{}'", username);
        if ("changeme".equals(password)) {
            log.warn("""
                    =====================================================================
                    Admin account created with the DEFAULT development password.
                    Set app.admin.password (or ADMIN_PASSWORD) before deploying anywhere
                    reachable from the internet.
                    =====================================================================""");
        }
    }
}

package com.portfolio.backend.security;

import com.portfolio.backend.entity.AdminUser;
import com.portfolio.backend.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The bridge between our {@link AdminUser} table and Spring Security's user model.
 *
 * <p>Spring Security never touches JPA directly — it asks a {@link UserDetailsService} for a
 * {@link UserDetails} by username and works with that. Implementing the interface here is what
 * lets the entity stay a plain persistence object.
 *
 * <p>Declaring this as a bean also switches off Boot's default in-memory user, so the random
 * password stops being printed at startup.
 */
@Service
@RequiredArgsConstructor
public class AdminUserDetailsService implements UserDetailsService {

    private final AdminUserRepository adminUserRepository;

    /**
     * {@code @RequiredArgsConstructor} (Lombok) generates a constructor taking every final
     * field, which Spring then uses for injection — the same constructor injection written by
     * hand in JwtService, minus the boilerplate.
     */
    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        AdminUser admin = adminUserRepository.findByUsername(username)
                // Same exception whether the user is missing or the password is wrong: telling
                // an attacker which usernames exist is a free gift.
                .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));

        return User.withUsername(admin.getUsername())
                .password(admin.getPasswordHash())
                // Spring's convention: hasRole("ADMIN") looks for the authority "ROLE_ADMIN".
                // The roles() builder adds that prefix for us.
                .roles(admin.getRole().name())
                .disabled(!admin.isEnabled())
                .build();
    }
}

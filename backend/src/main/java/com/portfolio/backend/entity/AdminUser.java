package com.portfolio.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * An account that can log into the admin dashboard.
 *
 * <p>Deliberately a plain JPA entity rather than an implementation of Spring Security's
 * {@code UserDetails}. Keeping the persistence model free of framework interfaces means the
 * security layer can adapt it when we wire up JWT, instead of this class having to satisfy
 * both jobs at once.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(
        name = "admin_users",
        uniqueConstraints = @UniqueConstraint(name = "uk_admin_user_username", columnNames = "username")
)
public class AdminUser extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String username;

    @Column(length = 200)
    private String email;

    /**
     * BCrypt hash — never the plaintext password.
     *
     * <p>Named {@code passwordHash} rather than {@code password} so that any code reaching for
     * it has to acknowledge what it's holding. 60 chars is BCrypt's fixed output width; the
     * column is wider to leave room for a future algorithm change.
     */
    @Column(nullable = false, length = 100)
    private String passwordHash;

    @Column(length = 100)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role = Role.ADMIN;

    /** Lets an account be switched off without deleting it. */
    @Column(nullable = false)
    private boolean enabled = true;

    private Instant lastLoginAt;
}

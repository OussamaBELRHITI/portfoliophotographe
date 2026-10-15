package com.portfolio.backend.entity;

/**
 * Authorities an admin account can hold.
 *
 * <p>Realistically there is one account — the photographer — but modelling the role now means
 * Spring Security has something to authorize against, and adding a read-only assistant later
 * won't require a migration.
 */
public enum Role {
    ADMIN
}

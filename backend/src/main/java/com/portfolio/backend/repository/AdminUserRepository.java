package com.portfolio.backend.repository;

import com.portfolio.backend.entity.AdminUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AdminUserRepository extends JpaRepository<AdminUser, Long> {

    /** What the JWT login flow calls to resolve the submitted username. */
    Optional<AdminUser> findByUsername(String username);

    boolean existsByUsername(String username);
}

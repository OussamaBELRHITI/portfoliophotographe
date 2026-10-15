package com.portfolio.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Switches on the {@code @CreatedDate} / {@code @LastModifiedDate} handling that
 * {@link com.portfolio.backend.entity.BaseEntity} relies on.
 *
 * <p>It lives in its own class rather than on the main application class on purpose: annotating
 * {@code BackendApplication} with {@code @EnableJpaAuditing} makes every {@code @WebMvcTest}
 * drag in the auditing infrastructure, which then fails for want of a JPA context. Isolating it
 * means slice tests can simply not import this class.
 */
@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {
}

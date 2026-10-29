package com.portfolio.backend.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.List;

/**
 * Typed view of the {@code app.*} block in application.yml.
 *
 * <p>Records give constructor binding: Spring builds this once at startup and it is immutable
 * thereafter. Combined with {@code @Validated}, a missing or malformed value fails the context
 * immediately with a readable message — much better than {@code @Value} handing you a null that
 * only explodes on the first upload, three screens into the admin dashboard.
 */
@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Cors cors,
        Jwt jwt,
        Storage storage
) {

    public record Cors(List<String> allowedOrigins) {
    }

    public record Jwt(
            @NotBlank String secret,
            @Positive long expirationMs,
            @NotBlank String issuer
    ) {
    }

    /**
     * Where uploaded photos and videos are kept.
     *
     * <p>{@code directory} is a path inside this container, mounted as a Docker volume so the
     * files outlive any rebuild. {@code publicBaseUrl} is the address the browser fetches them
     * from — the reverse proxy serves that path straight off the same volume, so reads never
     * reach this application.
     */
    public record Storage(String directory, String publicBaseUrl) {
    }
}

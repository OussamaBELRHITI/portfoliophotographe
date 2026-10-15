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
        Cloudinary cloudinary
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
     * Cloudinary credentials. Only {@code cloudName} is ever safe to expose to the browser;
     * the API secret exists solely to sign requests on this side.
     */
    public record Cloudinary(
            String cloudName,
            String apiKey,
            String apiSecret,
            String uploadFolder
    ) {
        /** Uploads are rejected with a clear message rather than a confusing 500 when unset. */
        public boolean isConfigured() {
            return cloudName != null && !cloudName.isBlank()
                    && apiKey != null && !apiKey.isBlank()
                    && apiSecret != null && !apiSecret.isBlank();
        }
    }
}

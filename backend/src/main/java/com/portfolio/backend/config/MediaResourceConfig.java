package com.portfolio.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.time.Duration;

/**
 * Serves uploaded files at {@code /media/**}.
 *
 * <p>This exists for development, where there is no reverse proxy and the browser fetches
 * photographs from the API directly. In production Caddy serves the same directory off disk and
 * these requests never arrive here — the handler stays registered anyway so that a deployment
 * without a proxy in front still works rather than returning 404s for every image.
 *
 * <p>Cached hard and immutably: a stored file's name contains a UUID and its contents never
 * change, so there is nothing to revalidate. Editing a photo produces a new upload with a new
 * name, which sidesteps cache invalidation entirely.
 */
@Configuration
@RequiredArgsConstructor
public class MediaResourceConfig implements WebMvcConfigurer {

    private final AppProperties properties;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path root = Path.of(properties.storage().directory()).toAbsolutePath().normalize();

        registry.addResourceHandler("/media/**")
                // Trailing separator matters: without it "…/media" would also match a sibling
                // directory whose name merely starts with "media".
                .addResourceLocations(root.toUri().toString())
                .setCachePeriod((int) Duration.ofDays(365).toSeconds());
    }
}

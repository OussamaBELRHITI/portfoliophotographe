package com.portfolio.backend.service;

import com.portfolio.backend.dto.SiteSettingsDto;
import com.portfolio.backend.entity.SiteSettings;
import com.portfolio.backend.repository.SiteSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SiteSettingsService {

    private final SiteSettingsRepository repository;

    /**
     * Returns the settings row, creating it with defaults on first access.
     *
     * <p>Lazy creation rather than a seeder: it keeps the row in existence without an ordering
     * dependency on startup, and means a deleted row heals itself instead of 500ing the home
     * page.
     */
    @Transactional
    public SiteSettings getOrCreate() {
        // "First row" rather than "row with id 1": the id is database-generated, so the
        // singleton is enforced by only ever inserting when the table is empty.
        return repository.findAll().stream()
                .findFirst()
                .orElseGet(() -> {
                    log.info("No site settings found — creating defaults");
                    return repository.save(SiteSettings.withDefaults());
                });
    }

    /**
     * Read-write despite being a "get", because it may have to create the row on first access.
     *
     * <p>The annotation has to be here, not only on {@link #getOrCreate()}. Spring implements
     * {@code @Transactional} with a proxy that wraps the bean: annotations only take effect on
     * calls that arrive <em>through</em> that proxy. A call to {@code getOrCreate()} from
     * inside this class goes straight to {@code this}, bypassing the proxy entirely — so its
     * read-write setting is ignored and the insert inherits the read-only transaction opened
     * here, which Postgres rejects outright.
     */
    @Transactional
    public SiteSettingsDto get() {
        return SiteSettingsDto.from(getOrCreate());
    }

    @Transactional
    public SiteSettingsDto update(SiteSettingsDto request) {
        SiteSettings settings = getOrCreate();

        settings.setSiteName(trimToNull(request.siteName()));
        settings.setHeroEyebrow(trimToNull(request.heroEyebrow()));
        settings.setHeroTagline(trimToNull(request.heroTagline()));
        settings.setAboutHeading(trimToNull(request.aboutHeading()));
        settings.setAboutBody(trimToNull(request.aboutBody()));
        settings.setAboutPortraitUrl(trimToNull(request.aboutPortraitUrl()));
        settings.setWorkBannerUrl(trimToNull(request.workBannerUrl()));
        settings.setVideosBannerUrl(trimToNull(request.videosBannerUrl()));
        settings.setContactEmail(trimToNull(request.contactEmail()));
        settings.setContactPhone(trimToNull(request.contactPhone()));
        settings.setInstagramUrl(trimToNull(request.instagramUrl()));
        settings.setWhatsappUrl(trimToNull(request.whatsappUrl()));
        settings.setLocation(trimToNull(request.location()));
        settings.setMetaDescription(trimToNull(request.metaDescription()));

        log.info("Site settings updated");
        return SiteSettingsDto.from(settings);
    }

    /**
     * An empty form field arrives as "" — storing that would make the frontend render an empty
     * element where it should fall back to a default or omit the block entirely.
     */
    private static String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

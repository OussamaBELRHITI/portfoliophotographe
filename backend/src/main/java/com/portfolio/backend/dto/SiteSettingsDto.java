package com.portfolio.backend.dto;

import com.portfolio.backend.entity.SiteSettings;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

/**
 * Doubles as the request and response shape for settings.
 *
 * <p>Unusual for one record to serve both directions, but here the read and write shapes are
 * genuinely identical — there is no id to hide and no server-computed field.
 */
public record SiteSettingsDto(
        @Size(max = 100) String siteName,
        @Size(max = 120) String heroEyebrow,
        @Size(max = 400) String heroTagline,
        @Size(max = 120) String aboutHeading,
        String aboutBody,
        @Size(max = 600) String aboutPortraitUrl,
        @Size(max = 600) String workBannerUrl,
        @Size(max = 600) String videosBannerUrl,
        @Email(message = "Must be a valid email address") @Size(max = 200) String contactEmail,
        @Size(max = 50) String contactPhone,
        @Size(max = 300) String instagramUrl,
        @Size(max = 300) String whatsappUrl,
        @Size(max = 120) String location,
        @Size(max = 300) String metaDescription
) {
    public static SiteSettingsDto from(SiteSettings s) {
        return new SiteSettingsDto(
                s.getSiteName(),
                s.getHeroEyebrow(),
                s.getHeroTagline(),
                s.getAboutHeading(),
                s.getAboutBody(),
                s.getAboutPortraitUrl(),
                s.getWorkBannerUrl(),
                s.getVideosBannerUrl(),
                s.getContactEmail(),
                s.getContactPhone(),
                s.getInstagramUrl(),
                s.getWhatsappUrl(),
                s.getLocation(),
                s.getMetaDescription()
        );
    }
}

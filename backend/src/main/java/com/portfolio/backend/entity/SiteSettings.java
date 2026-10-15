package com.portfolio.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Every piece of editable copy on the public site.
 *
 * <p>Exists so the photographer can change his own name, tagline, bio and contact details from
 * the dashboard. Before this, those lived in environment variables — which meant "manage
 * everything himself without touching code" quietly wasn't true for the words on the page.
 *
 * <p>Modelled as a singleton row (always id 1). A settings table with one row is a little
 * unusual, but the alternative — a key/value table — trades compile-time field names for
 * stringly-typed lookups and loses validation.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "site_settings")
public class SiteSettings extends BaseEntity {

    /* ---- identity ---- */

    @Column(length = 100)
    private String siteName;

    /** Small tracked-out line above the hero headline. */
    @Column(length = 120)
    private String heroEyebrow;

    /** Sentence under the hero headline. */
    @Column(length = 400)
    private String heroTagline;

    /* ---- about ---- */

    @Column(length = 120)
    private String aboutHeading;

    @Column(columnDefinition = "text")
    private String aboutBody;

    /** Cloudinary URL of a portrait for the about page. */
    @Column(length = 600)
    private String aboutPortraitUrl;

    /* ---- page banners ---- */

    /**
     * Cloudinary URL shown as a short image band above the gallery grid on /work.
     *
     * <p>Deliberately separate from the home page's featured hero: reusing that image would
     * put the same photo full-screen on the very first page a visitor lands on, then again
     * immediately after clicking through — this lets the photographer choose a different one,
     * or leave it unset, in which case /work falls back to a plain text header.
     */
    @Column(length = 600)
    private String workBannerUrl;

    /** Same idea as {@link #workBannerUrl}, for the /videos (Film) page. */
    @Column(length = 600)
    private String videosBannerUrl;

    /* ---- contact ---- */

    @Column(length = 200)
    private String contactEmail;

    @Column(length = 50)
    private String contactPhone;

    @Column(length = 300)
    private String instagramUrl;

    @Column(length = 300)
    private String whatsappUrl;

    @Column(length = 120)
    private String location;

    /* ---- seo ---- */

    @Column(length = 300)
    private String metaDescription;

    /**
     * Sensible starting content so a fresh install doesn't render a page full of blanks.
     * Overwritten the moment the photographer saves the settings form.
     */
    public static SiteSettings withDefaults() {
        // Deliberately no setId: the id column is IDENTITY-generated, and pre-setting it makes
        // Spring Data treat the object as detached and issue an UPDATE against a row that does
        // not exist yet — which fails as an optimistic-locking error rather than inserting.
        SiteSettings s = new SiteSettings();
        s.setSiteName("Studio");
        s.setHeroEyebrow("Photography & Film");
        s.setHeroTagline("Stories told in stills and motion.");
        s.setAboutHeading("About");
        s.setAboutBody("Tell visitors who you are, how you work, and what you love shooting.");
        s.setLocation("Available worldwide");
        s.setMetaDescription("Photography and film portfolio.");
        return s;
    }
}

package com.portfolio.backend.controller;

import com.portfolio.backend.dto.CategoryResponse;
import com.portfolio.backend.dto.MediaResponse;
import com.portfolio.backend.dto.SiteSettingsDto;
import com.portfolio.backend.service.CategoryService;
import com.portfolio.backend.service.MediaService;
import com.portfolio.backend.service.SiteSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Everything the public portfolio site reads. No authentication, and read-only — GETs only.
 *
 * <p>Each method here deliberately calls the "visible only" service variant, so hidden
 * categories and media cannot leak out through the public API even if someone guesses a slug.
 */
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private final CategoryService categoryService;
    private final MediaService mediaService;
    private final SiteSettingsService siteSettingsService;

    /** Drives the sidebar menu and the gallery index. */
    @GetMapping("/categories")
    public ResponseEntity<List<CategoryResponse>> categories() {
        return ResponseEntity.ok(categoryService.getVisibleCategories());
    }

    @GetMapping("/categories/{slug}")
    public ResponseEntity<CategoryResponse> category(@PathVariable String slug) {
        return ResponseEntity.ok(categoryService.getVisibleBySlug(slug));
    }

    /** The photos in one gallery, in the order the photographer arranged them. */
    @GetMapping("/categories/{slug}/media")
    public ResponseEntity<List<MediaResponse>> categoryMedia(@PathVariable String slug) {
        return ResponseEntity.ok(mediaService.getBySlug(slug, true));
    }

    /** The standalone video section. */
    @GetMapping("/videos")
    public ResponseEntity<List<MediaResponse>> videos() {
        return ResponseEntity.ok(mediaService.getVideos());
    }

    /** The films filed under one category — mirrors {@link #categoryMedia} for the Film section. */
    @GetMapping("/categories/{slug}/videos")
    public ResponseEntity<List<MediaResponse>> categoryVideos(@PathVariable String slug) {
        return ResponseEntity.ok(mediaService.getVideosBySlug(slug, true));
    }

    /**
     * Hero for the home page. 204 rather than 404 when there is no media at all — an empty
     * portfolio is a normal state on a new site, not an error worth logging.
     */
    @GetMapping("/hero")
    public ResponseEntity<MediaResponse> hero() {
        return mediaService.getHero()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/featured")
    public ResponseEntity<List<MediaResponse>> featured() {
        return ResponseEntity.ok(mediaService.getFeatured());
    }

    /** All editable site copy — name, tagline, bio, contact details. */
    @GetMapping("/settings")
    public ResponseEntity<SiteSettingsDto> settings() {
        return ResponseEntity.ok(siteSettingsService.get());
    }
}

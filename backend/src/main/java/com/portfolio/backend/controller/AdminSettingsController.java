package com.portfolio.backend.controller;

import com.portfolio.backend.dto.SiteSettingsDto;
import com.portfolio.backend.service.SiteSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lets the photographer edit every word on the public site without touching code.
 */
@RestController
@RequestMapping("/api/admin/settings")
@RequiredArgsConstructor
public class AdminSettingsController {

    private final SiteSettingsService siteSettingsService;

    @GetMapping
    public ResponseEntity<SiteSettingsDto> get() {
        return ResponseEntity.ok(siteSettingsService.get());
    }

    /** PUT rather than PATCH: the settings form always submits every field. */
    @PutMapping
    public ResponseEntity<SiteSettingsDto> update(@Valid @RequestBody SiteSettingsDto request) {
        return ResponseEntity.ok(siteSettingsService.update(request));
    }
}

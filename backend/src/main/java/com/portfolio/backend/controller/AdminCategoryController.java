package com.portfolio.backend.controller;

import com.portfolio.backend.dto.CategoryRequest;
import com.portfolio.backend.dto.CategoryResponse;
import com.portfolio.backend.dto.ReorderRequest;
import com.portfolio.backend.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

/**
 * Category management for the dashboard.
 *
 * <p>The whole {@code /api/admin/**} tree is gated by {@code hasRole("ADMIN")} in SecurityConfig,
 * so no method-level security annotation is needed here — the rule lives in one place rather
 * than being repeated (and eventually forgotten) on each handler.
 *
 * <p>Verb choices follow REST conventions: PUT replaces, PATCH adjusts one aspect, POST creates
 * and returns 201 with a Location header.
 */
@RestController
@RequestMapping("/api/admin/categories")
@RequiredArgsConstructor
public class AdminCategoryController {

    private final CategoryService categoryService;

    /** Includes hidden categories — this is the management view. */
    @GetMapping
    public ResponseEntity<List<CategoryResponse>> list() {
        return ResponseEntity.ok(categoryService.getAllCategories());
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> create(@Valid @RequestBody CategoryRequest request) {
        CategoryResponse created = categoryService.create(request);
        return ResponseEntity
                .created(URI.create("/api/admin/categories/" + created.id()))
                .body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody CategoryRequest request
    ) {
        return ResponseEntity.ok(categoryService.update(id, request));
    }

    /** The hide/show toggle. */
    @PatchMapping("/{id}/visibility")
    public ResponseEntity<CategoryResponse> setVisibility(
            @PathVariable Long id,
            @RequestParam boolean visible
    ) {
        return ResponseEntity.ok(categoryService.setVisibility(id, visible));
    }

    /** Accepts the full ordered id list from the drag-and-drop UI. */
    @PatchMapping("/reorder")
    public ResponseEntity<Void> reorder(@Valid @RequestBody ReorderRequest request) {
        categoryService.reorder(request);
        return ResponseEntity.noContent().build();
    }

    /** 204 rather than 200: there is no body worth returning after a delete. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        categoryService.delete(id);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}

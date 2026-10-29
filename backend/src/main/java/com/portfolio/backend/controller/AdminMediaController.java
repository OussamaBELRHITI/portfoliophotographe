package com.portfolio.backend.controller;

import com.portfolio.backend.dto.StoredFile;
import com.portfolio.backend.dto.MediaCreateRequest;
import com.portfolio.backend.dto.MediaResponse;
import com.portfolio.backend.dto.MediaUpdateRequest;
import com.portfolio.backend.dto.ReorderRequest;
import com.portfolio.backend.service.StorageService;
import com.portfolio.backend.service.MediaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.List;

/**
 * Media management, plus the endpoint that makes direct-to-storage uploads possible.
 */
@RestController
@RequestMapping("/api/admin/media")
@RequiredArgsConstructor
public class AdminMediaController {

    private final MediaService mediaService;
    private final StorageService storageService;

    /**
     * Receives one file and writes it to disk.
     *
     * <p>Called once per file the browser produces — so a photo costs two calls (the display
     * copy and the grid thumbnail) and a video costs two (the clip and its captured poster
     * frame). Returning the key and URL rather than creating the row lets the dashboard gather
     * every piece first and register the finished set in a single {@link #create}.
     *
     * <p>The bytes stream to disk; they are never held whole in memory.
     */
    @PostMapping("/upload")
    public ResponseEntity<StoredFile> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String filename
    ) {
        return ResponseEntity.ok(storageService.store(file, filename));
    }

    /** Records the metadata once the browser has finished uploading. */
    @PostMapping
    public ResponseEntity<MediaResponse> create(@Valid @RequestBody MediaCreateRequest request) {
        MediaResponse created = mediaService.create(request);
        return ResponseEntity
                .created(URI.create("/api/admin/media/" + created.id()))
                .body(created);
    }

    @GetMapping
    public ResponseEntity<List<MediaResponse>> list(
            @RequestParam(required = false) Long categoryId
    ) {
        return ResponseEntity.ok(categoryId == null
                ? mediaService.getAll()
                : mediaService.getByCategory(categoryId, false));
    }

    /** PATCH, not PUT: every field is optional and omitted ones are left alone. */
    @PatchMapping("/{id}")
    public ResponseEntity<MediaResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody MediaUpdateRequest request
    ) {
        return ResponseEntity.ok(mediaService.update(id, request));
    }

    @PatchMapping("/reorder")
    public ResponseEntity<Void> reorder(@Valid @RequestBody ReorderRequest request) {
        mediaService.reorder(request);
        return ResponseEntity.noContent().build();
    }

    /** Removes the stored files as well as the row — see MediaService.delete for the order. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        mediaService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

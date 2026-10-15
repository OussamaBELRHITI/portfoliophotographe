package com.portfolio.backend.controller;

import com.portfolio.backend.dto.CloudinarySignatureResponse;
import com.portfolio.backend.dto.MediaCreateRequest;
import com.portfolio.backend.dto.MediaResponse;
import com.portfolio.backend.dto.MediaUpdateRequest;
import com.portfolio.backend.dto.ReorderRequest;
import com.portfolio.backend.service.CloudinaryService;
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

import java.net.URI;
import java.util.List;

/**
 * Media management, plus the endpoint that makes direct-to-Cloudinary uploads possible.
 */
@RestController
@RequestMapping("/api/admin/media")
@RequiredArgsConstructor
public class AdminMediaController {

    private final MediaService mediaService;
    private final CloudinaryService cloudinaryService;

    /**
     * Step 2 of the upload flow.
     *
     * <p>The dashboard calls this first, then POSTs the file straight to Cloudinary with the
     * returned signature, then calls {@link #create} with whatever Cloudinary answered. The file
     * bytes never touch this server, which is what keeps a 40 MB video upload from occupying a
     * request thread and a chunk of heap.
     */
    @PostMapping("/upload-signature")
    public ResponseEntity<CloudinarySignatureResponse> uploadSignature() {
        return ResponseEntity.ok(cloudinaryService.createUploadSignature());
    }

    /** Step 5: persist the metadata Cloudinary returned. */
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

    /** Removes the Cloudinary asset as well as the row — see MediaService.delete for the order. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        mediaService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

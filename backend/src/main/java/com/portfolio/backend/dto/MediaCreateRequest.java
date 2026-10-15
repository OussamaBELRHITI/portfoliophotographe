package com.portfolio.backend.dto;

import com.portfolio.backend.entity.MediaType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Step 5 of the upload flow: the browser has finished uploading straight to Cloudinary and is
 * now telling us where the file landed.
 *
 * <p>The dimensions and format come from Cloudinary's upload response rather than being
 * inferred here — the backend never sees the bytes.
 */
public record MediaCreateRequest(
        @Size(max = 200)
        String title,

        @Size(max = 1000)
        String description,

        @NotBlank(message = "Cloudinary URL is required")
        @Size(max = 600)
        String url,

        @NotBlank(message = "Cloudinary public ID is required")
        @Size(max = 300)
        String publicId,

        @NotNull(message = "Media type is required")
        MediaType type,

        Integer width,
        Integer height,
        String format,
        Long bytes,
        Double durationSeconds,

        /** Null is allowed: videos can live in the standalone video section. */
        Long categoryId,

        Boolean visible
) {
}

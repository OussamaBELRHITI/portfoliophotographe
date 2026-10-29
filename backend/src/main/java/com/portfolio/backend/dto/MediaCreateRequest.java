package com.portfolio.backend.dto;

import com.portfolio.backend.entity.MediaType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * The last step of the upload flow: the browser has finished pushing the file straight to
 * storage and is now recording where it landed.
 *
 * <p>Dimensions, format and the derived copies are all measured or produced in the browser —
 * the backend never sees the bytes, so it has nothing to inspect them with.
 */
public record MediaCreateRequest(
        @Size(max = 200)
        String title,

        @Size(max = 1000)
        String description,

        @NotBlank(message = "A file URL is required")
        @Size(max = 600)
        String url,

        @NotBlank(message = "A storage key is required")
        @Size(max = 300)
        String storageKey,

        /** Grid-sized copy of an image. Absent for video. */
        @Size(max = 600) String thumbnailUrl,
        @Size(max = 300) String thumbnailStorageKey,

        /** Still frame for a video, captured in the browser. Absent for images. */
        @Size(max = 600) String posterUrl,
        @Size(max = 300) String posterStorageKey,

        /** Inlined data URI, a couple of kilobytes, shown while the real file loads. */
        String blurDataUrl,

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

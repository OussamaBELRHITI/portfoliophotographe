package com.portfolio.backend.dto;

import com.portfolio.backend.entity.Media;
import com.portfolio.backend.entity.MediaType;

import java.time.Instant;

public record MediaResponse(
        Long id,
        String title,
        String description,
        String url,
        /** Grid-sized copy; null for video and for anything uploaded before it existed. */
        String thumbnailUrl,
        /** A video's still frame; null for images. */
        String posterUrl,
        /** Inline blur placeholder, shown while the real file loads. */
        String blurDataUrl,
        String storageKey,
        MediaType type,
        Integer width,
        Integer height,
        String format,
        Long bytes,
        Double durationSeconds,
        boolean visible,
        boolean featured,
        int displayOrder,
        Long categoryId,
        Instant createdAt
) {
    /**
     * Takes categoryId as a parameter rather than reading {@code media.getCategory().getId()},
     * because that getter would trigger a lazy load — one extra query per row. The service
     * fetches the association up front and passes the id down.
     */
    public static MediaResponse from(Media media, Long categoryId) {
        return new MediaResponse(
                media.getId(),
                media.getTitle(),
                media.getDescription(),
                media.getUrl(),
                media.getThumbnailUrl(),
                media.getPosterUrl(),
                media.getBlurDataUrl(),
                media.getStorageKey(),
                media.getType(),
                media.getWidth(),
                media.getHeight(),
                media.getFormat(),
                media.getBytes(),
                media.getDurationSeconds(),
                media.isVisible(),
                media.isFeatured(),
                media.getDisplayOrder(),
                categoryId,
                media.getCreatedAt()
        );
    }
}

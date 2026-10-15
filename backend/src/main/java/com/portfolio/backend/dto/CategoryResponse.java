package com.portfolio.backend.dto;

import com.portfolio.backend.entity.Category;

import java.time.Instant;

/**
 * What the API returns for a category.
 *
 * <p>Why not just return the {@link Category} entity? Three reasons, and they bite in order:
 * <ol>
 *   <li>Serialising an entity walks its lazy associations, so returning a Category would try to
 *       load every Media row — an N+1 query storm triggered from the JSON writer.</li>
 *   <li>The JSON shape becomes accidentally coupled to the database schema, so renaming a
 *       column silently breaks the frontend.</li>
 *   <li>It leaks whatever we add later. A DTO is an explicit, reviewed contract.</li>
 * </ol>
 */
public record CategoryResponse(
        Long id,
        String name,
        String slug,
        String description,
        boolean visible,
        int displayOrder,
        long mediaCount,
        String coverImageUrl,
        Instant createdAt,
        Instant updatedAt
) {
    public static CategoryResponse from(Category category, long mediaCount, String coverImageUrl) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getSlug(),
                category.getDescription(),
                category.isVisible(),
                category.getDisplayOrder(),
                mediaCount,
                coverImageUrl,
                category.getCreatedAt(),
                category.getUpdatedAt()
        );
    }
}

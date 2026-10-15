package com.portfolio.backend.dto;

import jakarta.validation.constraints.Size;

/**
 * Edits to an existing media item's metadata. The Cloudinary URL and public ID are absent on
 * purpose — repointing a row at a different asset is not an edit, it is a new upload.
 *
 * <p>Every field is nullable and treated as "leave unchanged", which makes this a PATCH-style
 * partial update. That is also why moving an item <em>out</em> of its gallery needs its own
 * flag: a null {@code categoryId} already means "leave the category alone".
 */
public record MediaUpdateRequest(
        @Size(max = 200) String title,
        @Size(max = 1000) String description,
        Long categoryId,
        /** True detaches the item from its gallery ("Unfiled"). Ignored if categoryId is set. */
        Boolean removeFromCategory,
        Boolean visible,
        Boolean featured,
        Integer displayOrder
) {
}

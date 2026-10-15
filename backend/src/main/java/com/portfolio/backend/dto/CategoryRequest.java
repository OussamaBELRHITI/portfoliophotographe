package com.portfolio.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Create/update payload for a category.
 *
 * <p>Note what is <em>absent</em>: no id, no timestamps, no media list. A request DTO should
 * only accept what a client is allowed to set — if {@code id} were bindable here, a crafted
 * request could try to overwrite a different row.
 */
public record CategoryRequest(
        @NotBlank(message = "Name is required")
        @Size(max = 100, message = "Name must be at most 100 characters")
        String name,

        /**
         * Optional — the service derives one from the name when omitted.
         */
        @Pattern(
                regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$",
                message = "Slug must be lowercase letters, numbers and single hyphens"
        )
        @Size(max = 120)
        String slug,

        @Size(max = 500, message = "Description must be at most 500 characters")
        String description,

        Boolean visible,

        Integer displayOrder
) {
}

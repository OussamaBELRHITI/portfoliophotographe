package com.portfolio.backend.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * Drag-and-drop reordering: the dashboard sends the ids in their new visual order and the
 * service assigns {@code displayOrder} from the list index.
 *
 * <p>Sending the whole order in one request rather than a PATCH per moved item keeps the
 * operation atomic — a dropped connection halfway through can't leave the gallery scrambled.
 */
public record ReorderRequest(
        @NotEmpty(message = "At least one id is required")
        List<Long> orderedIds
) {
}

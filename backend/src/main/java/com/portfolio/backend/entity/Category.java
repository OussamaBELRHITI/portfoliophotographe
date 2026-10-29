package com.portfolio.backend.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/**
 * A gallery grouping — "Weddings", "Portraits", "Street". Categories also drive the sidebar
 * menu on the public site, which is why they carry their own visibility flag and sort order:
 * the photographer can build a category, fill it, and only then reveal it.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(
        name = "categories",
        uniqueConstraints = @UniqueConstraint(name = "uk_category_slug", columnNames = "slug")
)
public class Category extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String name;

    /** URL-safe identifier used by the public site: /gallery/{slug}. */
    @Column(nullable = false, length = 120)
    private String slug;

    @Column(length = 500)
    private String description;

    /**
     * Hidden categories stay in the database and keep their media, but are filtered out of
     * every public endpoint. This is the "hide/show" the photographer asked for — it is
     * deliberately not a delete.
     */
    @Column(nullable = false)
    private boolean visible = true;

    /** Position in the sidebar. Lower sorts first. */
    @Column(nullable = false)
    private int displayOrder = 0;

    /**
     * The inverse (non-owning) side of the Category–Media relationship.
     *
     * <p>{@code mappedBy = "category"} says: the Media entity owns this link — the foreign key
     * lives in the media table's {@code category_id} column. Hibernate reads that field to
     * decide what to write; adding to this list alone would not persist anything, which is why
     * the helper methods below keep both sides in sync.
     *
     * <p>{@code orphanRemoval = false} is intentional: detaching a photo from a category should
     * not delete the photo, because the stored file still exists and may be re-filed.
     */
    @OneToMany(mappedBy = "category", cascade = CascadeType.PERSIST, orphanRemoval = false)
    @OrderBy("displayOrder ASC, id ASC")
    private List<Media> media = new ArrayList<>();

    public void addMedia(Media item) {
        media.add(item);
        item.setCategory(this);
    }

    public void removeMedia(Media item) {
        media.remove(item);
        item.setCategory(null);
    }
}

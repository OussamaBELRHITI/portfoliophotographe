package com.portfolio.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One photo or video. The file itself lives in object storage — this row stores only the
 * pointers to it plus the metadata the site needs to lay it out.
 *
 * <p>Two URLs for an image, not one: storage serves files exactly as uploaded, with no
 * resize-on-request, so the browser makes both sizes at upload time and stores each. A gallery
 * tile then fetches the small one instead of pulling a full-resolution frame to draw it 400px
 * wide.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(
        name = "media",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_media_storage_key",
                columnNames = "storage_key"
        ),
        indexes = @Index(name = "idx_media_category", columnList = "category_id")
)
public class Media extends BaseEntity {

    @Column(length = 200)
    private String title;

    @Column(length = 1000)
    private String description;

    /** Full-size delivery URL — what the hero and the lightbox load. */
    @Column(nullable = false, length = 600)
    private String url;

    /**
     * Smaller copy for grid tiles. Null for video, and null for anything uploaded before the
     * second size existed, so readers must fall back to {@link #url}.
     */
    @Column(length = 600)
    private String thumbnailUrl;

    /**
     * Still frame for a video, captured in the browser at upload. Storage cannot generate one
     * on demand the way a media CDN does, so it is produced once and stored as its own object.
     */
    @Column(length = 600)
    private String posterUrl;

    /**
     * A tiny blurred copy inlined as a data URI, shown while the real image loads.
     *
     * <p>Held in the row rather than as another stored object on purpose: it is a couple of
     * kilobytes, and fetching it over the network would defeat the point of having a
     * placeholder at all.
     */
    @Column(columnDefinition = "text")
    private String blurDataUrl;

    /**
     * The object's path in the bucket. This is what deletes the file, and it is unique so a
     * double-submitted upload cannot create two rows pointing at the same object.
     */
    @Column(name = "storage_key", nullable = false, length = 300)
    private String storageKey;

    /** The poster's own key, so deleting the video takes its still frame with it. */
    @Column(length = 300)
    private String posterStorageKey;

    /** The thumbnail's key, deleted alongside the full-size image. */
    @Column(length = 300)
    private String thumbnailStorageKey;

    /**
     * {@code EnumType.STRING} stores "IMAGE"/"VIDEO" rather than 0/1. Ordinals are a trap:
     * reordering the enum constants later would silently reinterpret every existing row.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MediaType type;

    /**
     * Intrinsic dimensions, measured in the browser at upload. Next.js needs these
     * to reserve space for the image before it loads, which is what keeps a masonry gallery
     * from jumping around as it fills in.
     */
    private Integer width;
    private Integer height;

    /** e.g. "jpg", "mp4". */
    @Column(length = 20)
    private String format;

    /** Stored size in bytes, after the browser-side resize. */
    private Long bytes;

    /** Playback length for videos, in seconds. Null for images. */
    private Double durationSeconds;

    /** Per-item hide/show, independent of the category's own visibility. */
    @Column(nullable = false)
    private boolean visible = true;

    /**
     * Marks this as the home page hero.
     *
     * <p>Not a unique constraint: several items can be flagged, and the service picks by
     * display order. That lets the photographer stage a replacement hero before demoting the
     * current one, rather than leaving the home page heroless in between.
     */
    @Column(nullable = false)
    private boolean featured = false;

    /** Position within its gallery. Lower sorts first; this is what drag-to-reorder writes. */
    @Column(nullable = false)
    private int displayOrder = 0;

    /**
     * The owning side of the relationship — the {@code category_id} foreign key lives on this
     * table. Setting this field is what actually persists the link.
     *
     * <p>{@code FetchType.LAZY} is the important part. JPA defaults {@code @ManyToOne} to EAGER,
     * which would load the full Category (and anything it drags along) on every single media
     * row — so listing a 200-photo gallery would fire hundreds of extra queries. LAZY defers
     * that load until something actually calls {@code getCategory()}.
     *
     * <p>Nullable on purpose: videos in the standalone video section don't need to belong to a
     * photo category, and deleting a category shouldn't cascade into deleting its photos.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", foreignKey = @ForeignKey(name = "fk_media_category"))
    private Category category;
}
